begin;
do $test$
declare actor uuid; passenger uuid:=gen_random_uuid(); anonymous_user uuid:=gen_random_uuid();
  result jsonb; expected_count bigint; role_name text;
begin
  select user_id into actor from public.admin_users where role='admin' and is_active limit 1;
  if actor is null then raise exception 'Tests need an existing admin'; end if;
  insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous)
    values(passenger,'directory-test-'||passenger||'@example.invalid',now(),now(),false),
      (anonymous_user,null,null,now(),true);
  select count(*) into expected_count from auth.users where deleted_at is null;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.list_managed_users();
  if (result->>'total')::bigint<>expected_count then raise exception 'Directory must include passengers and staff'; end if;
  result:=public.list_managed_users(passenger::text,'passenger','active',0,25);
  if (result->>'total')::integer<>1 or result->'users'->0->>'role'<>'passenger' then raise exception 'Passenger search failed'; end if;
  result:=public.list_managed_users('','all','all',0,1);
  if jsonb_array_length(result->'users')<>1 then raise exception 'Page limit failed'; end if;
  result:=public.list_managed_users('','all','all',1000000,25);
  if jsonb_array_length(result->'users')<>0 or (result->>'total')::bigint<>expected_count then raise exception 'Empty page count failed'; end if;
  begin
    perform public.list_managed_users('','all','all',0,1000);
    raise exception 'Unbounded page accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.set_managed_user_access(actor,'passenger',true);
    raise exception 'Self-demotion accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_managed_user_access(anonymous_user,'admin',true);
    raise exception 'Anonymous staff promotion accepted';
  exception when invalid_parameter_value then null; end;
  perform public.set_managed_user_access(passenger,'operator',true);
  result:=public.list_managed_users(passenger::text,'staff','active',0,25);
  if result->'users'->0->>'role' is distinct from 'operator' then raise exception 'Promotion failed'; end if;
  perform public.set_managed_user_access(passenger,'operator',false);
  result:=public.list_managed_users(passenger::text,'staff','disabled',0,25);
  if (result->>'total')::integer<>1 then raise exception 'Staff disable failed'; end if;
  perform public.set_managed_user_access(passenger,'passenger',true);
  result:=public.list_managed_users(passenger::text,'passenger','active',0,25);
  if (result->>'total')::integer<>1 then raise exception 'Staff removal failed'; end if;
  execute 'reset role';
  if not exists(select 1 from auth.users where id=passenger) then raise exception 'Passenger account was deleted'; end if;
  if exists(select 1 from public.admin_users where user_id=passenger) then raise exception 'Passenger retained staff membership'; end if;
  if (select count(*) from private.staff_access_audit where user_id=passenger)<>3 then raise exception 'Access audit missing'; end if;
  foreach role_name in array array['operator','editor']
  loop
    update public.admin_users set role=role_name where user_id=actor;
    execute 'set local role authenticated';
    begin
      perform public.list_managed_users();
      raise exception 'Non-admin directory access allowed';
    exception when insufficient_privilege then null; end;
    begin
      perform public.set_managed_user_access(passenger,'admin',true);
      raise exception 'Non-admin role assignment allowed';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',passenger,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
    perform public.list_managed_users();
    raise exception 'Passenger directory access allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon';
  begin
    perform public.list_managed_users();
    raise exception 'Anonymous directory access allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $test$;
rollback;
