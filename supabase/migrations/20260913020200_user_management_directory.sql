-- Admin-only directory. Passenger means no row in public.admin_users.
create function private.list_managed_users(
  p_search text default '', p_kind text default 'all', p_status text default 'all',
  p_offset integer default 0, p_limit integer default 25
) returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_kind is null or p_kind not in ('all','staff','passenger','admin','editor','operator')
    or p_status is null or p_status not in ('all','active','pending','disabled','suspended')
    or p_limit is null or p_limit < 1 or p_limit > 100
    or p_offset is null or p_offset < 0 or p_search is null or length(p_search)>200 then
    raise exception 'Invalid directory filters or page size' using errcode='22023';
  end if;
  with directory as (
    select u.id as user_id, u.email::text, u.phone::text,
      coalesce(nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.raw_user_meta_data->>'name',''), '') as display_name,
      coalesce(a.role,'passenger') as role, a.is_active as staff_active,
      u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.invited_at, u.is_anonymous,
      case when u.banned_until>now() then 'suspended'
        when a.is_active=false then 'disabled'
        when u.is_anonymous or u.email_confirmed_at is not null or u.phone_confirmed_at is not null then 'active'
        else 'pending' end as status
    from auth.users u left join public.admin_users a on a.user_id=u.id
    where u.deleted_at is null
  ), matching as (
    select * from directory d
    where (p_kind='all' or (p_kind='staff' and d.role<>'passenger') or d.role=p_kind)
      and (p_status='all' or d.status=p_status)
      and (btrim(p_search)='' or position(lower(btrim(p_search)) in
        lower(concat_ws(' ',d.email,d.phone,d.display_name,d.user_id::text)))>0)
  )
  select jsonb_build_object(
    'total',(select count(*) from matching),
    'users',coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc nulls last,page.user_id)
      from (select * from matching order by created_at desc nulls last,user_id limit p_limit offset p_offset) page),'[]'::jsonb)
  ) into result;
  return result;
end $$;
create function public.list_managed_users(
  p_search text default '', p_kind text default 'all', p_status text default 'all',
  p_offset integer default 0, p_limit integer default 25
) returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.list_managed_users(p_search,p_kind,p_status,p_offset,p_limit) $$;
revoke all on function private.list_managed_users(text,text,text,integer,integer),
  public.list_managed_users(text,text,text,integer,integer) from public,anon;
grant execute on function private.list_managed_users(text,text,text,integer,integer),
  public.list_managed_users(text,text,text,integer,integer) to authenticated;

create function private.set_managed_user_access(p_user_id uuid,p_role text,p_is_active boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare previous public.admin_users%rowtype; target auth.users%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  lock table public.admin_users in share row exclusive mode;
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_user_id=auth.uid() then raise exception 'You cannot change your own staff access' using errcode='42501'; end if;
  if p_role is null or p_role not in ('passenger','admin','editor','operator') or p_is_active is null then
    raise exception 'Choose a valid role and staff access status' using errcode='22023';
  end if;
  select * into target from auth.users where id=p_user_id and deleted_at is null;
  if not found then raise exception 'Account not found' using errcode='22023'; end if;
  if p_role<>'passenger' and (target.is_anonymous or nullif(target.email,'') is null) then
    raise exception 'A staff account must have an email login' using errcode='22023';
  end if;
  select * into previous from public.admin_users where user_id=p_user_id;
  if p_role='passenger' then
    delete from public.admin_users where user_id=p_user_id;
  else
    insert into public.admin_users(user_id,role,is_active) values(p_user_id,p_role,p_is_active)
      on conflict(user_id) do update set role=excluded.role,is_active=excluded.is_active;
  end if;
  insert into private.staff_access_audit(actor_id,user_id,previous_role,new_role,previous_active,new_active)
    values(auth.uid(),p_user_id,previous.role,p_role,previous.is_active,
      case when p_role='passenger' then false else p_is_active end);
end $$;
create function public.set_managed_user_access(p_user_id uuid,p_role text,p_is_active boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.set_managed_user_access(p_user_id,p_role,p_is_active) $$;
revoke all on function private.set_managed_user_access(uuid,text,boolean),
  public.set_managed_user_access(uuid,text,boolean) from public,anon;
grant execute on function private.set_managed_user_access(uuid,text,boolean),
  public.set_managed_user_access(uuid,text,boolean) to authenticated;
