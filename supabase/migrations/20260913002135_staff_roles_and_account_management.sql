-- Existing PARA schema required. Keep public reads and passenger submissions intact.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;
alter table public.admin_users drop constraint admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check (role in ('admin', 'editor', 'operator'));
alter table public.admin_users add column is_active boolean not null default true;
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

create or replace function private.current_staff_role()
returns text language sql stable security definer set search_path = ''
as $$
  select a.role from public.admin_users a
  join auth.users u on u.id = a.user_id
  where a.user_id = (select auth.uid()) and a.is_active
    and (u.banned_until is null or u.banned_until <= now())
$$;
revoke all on function private.current_staff_role() from public;
grant execute on function private.current_staff_role() to anon, authenticated;
create or replace function public.current_staff_role()
returns text language sql stable security invoker set search_path = ''
as $$ select private.current_staff_role() $$;
create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce(private.current_staff_role() = 'admin', false) $$;
revoke all on function public.current_staff_role(), public.is_admin() from public;
grant execute on function public.current_staff_role(), public.is_admin() to anon, authenticated;

-- Replace all legacy staff policies on the affected tables, including the shared-header bypass.
do $$
declare p record; t text;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public'
    and tablename in ('routes','trips','stops','stop_times','shapes','dataset_metadata','reports','route_suggestions','distance_fares','train_fares')
    and (qual like '%is_admin()%' or with_check like '%is_admin()%'
      or qual like '%x-gtfs-editor-secret%' or with_check like '%x-gtfs-editor-secret%')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
  foreach t in array array['routes','trips','stops','stop_times','shapes','dataset_metadata']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon',t);
    execute format('create policy "GTFS staff manage data" on public.%I for all to authenticated using ((select private.current_staff_role()) in (''admin'',''editor'')) with check ((select private.current_staff_role()) in (''admin'',''editor''))',t);
  end loop;
  foreach t in array array['reports','route_suggestions','distance_fares','train_fares']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy "Operations staff read" on public.%I for select to authenticated using ((select private.current_staff_role()) in (''admin'',''operator''))',t);
    execute format('create policy "Operations staff create" on public.%I for insert to authenticated with check ((select private.current_staff_role()) in (''admin'',''operator''))',t);
    execute format('create policy "Operations staff update" on public.%I for update to authenticated using ((select private.current_staff_role()) in (''admin'',''operator'')) with check ((select private.current_staff_role()) in (''admin'',''operator''))',t);
    execute format('create policy "Admins delete operational records" on public.%I for delete to authenticated using ((select public.is_admin()))',t);
  end loop;
end $$;

-- Existing GTFS RPCs must use the editor permission too, and must obey RLS.
do $$
declare f record; definition text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_route_with_trips','replace_trip_stop_times')
  loop
    definition := pg_get_functiondef(f.oid);
    definition := replace(definition, 'not public.is_admin()', 'coalesce(private.current_staff_role() not in (''admin'', ''editor''), true)');
    definition := replace(definition, 'administrator access required', 'GTFS editor access required');
    definition := replace(definition, 'SECURITY DEFINER', 'SECURITY INVOKER');
    execute definition;
  end loop;
end $$;
alter function public.get_next_ltfrb_stop_id() security invoker;
alter function public.get_next_ltfrb_stop_id() set search_path = public;
revoke all on function public.create_route_with_trips(text,text,integer,text[]), public.replace_trip_stop_times(text,text[]) from public, anon;
grant execute on function public.create_route_with_trips(text,text,integer,text[]), public.replace_trip_stop_times(text,text[]) to authenticated;

create table private.staff_access_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  user_id uuid not null,
  previous_role text,
  new_role text not null,
  previous_active boolean,
  new_active boolean not null,
  created_at timestamptz not null default now()
);
alter table private.staff_access_audit enable row level security;
revoke all on private.staff_access_audit from public, anon, authenticated;

create function private.list_staff_accounts()
returns table(user_id uuid, email text, role text, is_active boolean, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select a.user_id, u.email::text, a.role, a.is_active, a.created_at
    from public.admin_users a join auth.users u on u.id = a.user_id order by lower(u.email);
end $$;
create function public.list_staff_accounts()
returns table(user_id uuid, email text, role text, is_active boolean, created_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.list_staff_accounts() $$;

create function private.set_staff_access(p_email text, p_role text, p_is_active boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_id uuid; previous public.admin_users%rowtype;
begin
  -- Serialize access changes, then recheck the caller to prevent concurrent demotion races.
  lock table public.admin_users in share row exclusive mode;
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin','editor','operator') or p_is_active is null then
    raise exception 'Choose a valid role and access status' using errcode = '22023';
  end if;
  select id into target_id from auth.users where lower(email) = lower(trim(p_email));
  if target_id is null then
    raise exception 'No account found. Create or invite this user in Supabase Authentication first.' using errcode = '22023';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own staff access' using errcode = '42501';
  end if;
  select * into previous from public.admin_users where public.admin_users.user_id = target_id;
  insert into public.admin_users(user_id, role, is_active) values(target_id,p_role,p_is_active)
    on conflict(user_id) do update set role=excluded.role, is_active=excluded.is_active;
  insert into private.staff_access_audit(actor_id,user_id,previous_role,new_role,previous_active,new_active)
    values(auth.uid(),target_id,previous.role,p_role,previous.is_active,p_is_active);
end $$;
create function public.set_staff_access(p_email text, p_role text, p_is_active boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.set_staff_access(p_email,p_role,p_is_active) $$;
revoke all on function private.list_staff_accounts(), public.list_staff_accounts(),
  private.set_staff_access(text,text,boolean), public.set_staff_access(text,text,boolean) from public, anon;
grant execute on function private.list_staff_accounts(), public.list_staff_accounts(),
  private.set_staff_access(text,text,boolean), public.set_staff_access(text,text,boolean) to authenticated;
