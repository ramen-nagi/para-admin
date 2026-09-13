begin;
-- Run in a transaction; all fixtures and role changes are rolled back.
do $test$
declare
  actor uuid; target uuid; target_email text; role_name text; n integer;
begin
  select user_id into actor from public.admin_users where role='admin' and is_active order by user_id limit 1;
  select a.user_id,u.email into target,target_email from public.admin_users a join auth.users u on u.id=a.user_id where a.user_id<>actor order by a.user_id limit 1;
  if actor is null or target is null then raise exception 'Tests require two existing staff accounts'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not public.is_admin() then raise exception 'Admin role check failed'; end if;
  perform public.list_staff_accounts();
  begin
    perform public.set_staff_access((select email from public.list_staff_accounts() where user_id=actor),'operator',true);
    raise exception 'Self demotion was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.admin_users set role='admin' where user_id=target;
    raise exception 'Direct membership writes were allowed';
  exception when insufficient_privilege then null; end;
  perform public.set_staff_access(target_email,'operator',true);
  perform public.set_staff_access(target_email,'editor',true);
  begin
    perform public.set_staff_access(target_email,'owner',true);
    raise exception 'Invalid role was allowed';
  exception when invalid_parameter_value then null; end;
  perform public.create_route_with_trips('__role_test_route__','Role test',3,array['__role_test_trip_1__','__role_test_trip_2__']);
  execute 'reset role';

  foreach role_name in array array['admin','editor','operator','disabled','nonstaff']
  loop
    update public.admin_users set role=case when role_name in ('disabled','nonstaff') then 'editor' else role_name end,
      is_active=(role_name<>'disabled') where user_id=target;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',case when role_name='nonstaff' then '00000000-0000-0000-0000-000000000000'::uuid else target end,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if public.current_staff_role() is distinct from (case when role_name in ('disabled','nonstaff') then null else role_name end) then
      raise exception 'Role resolution failed for %',role_name;
    end if;
    if public.is_admin() is distinct from (role_name='admin') then raise exception 'Admin check failed for %',role_name; end if;
    update public.routes set route_long_name='Role test updated' where route_id='__role_test_route__';
    get diagnostics n = row_count;
    if n <> (case when role_name in ('admin','editor') then 1 else 0 end) then raise exception 'GTFS update failed for %',role_name; end if;
    if role_name in ('admin','editor') then
      perform public.replace_trip_stop_times('__role_test_trip_1__',array[]::text[]);
    else
      begin
        perform public.replace_trip_stop_times('__role_test_trip_1__',array[]::text[]);
        raise exception 'GTFS RPC allowed for %',role_name;
      exception when raise_exception then
        if sqlerrm not like '%GTFS editor access required%' then raise; end if;
      end;
    end if;
    if role_name='admin' then
      perform public.list_staff_accounts();
    else
      begin
        perform public.list_staff_accounts();
        raise exception 'Account list allowed for %',role_name;
      exception when insufficient_privilege then null; end;
      begin
        perform public.set_staff_access(target_email,'admin',true);
        raise exception 'Account mutation allowed for %',role_name;
      exception when insufficient_privilege then null; end;
    end if;
    -- Existing fares provide a real RLS UPDATE target; writes roll back.
    update public.distance_fares set fare_type= fare_type;
    get diagnostics n = row_count;
    if role_name in ('admin','operator') and n=0 then raise exception 'Operations update denied for % (or no fare fixtures)',role_name; end if;
    if role_name not in ('admin','operator') and n<>0 then raise exception 'Operations update allowed for %',role_name; end if;
    delete from public.routes where route_id='__role_test_route__' and role_name not in ('admin','editor');
    get diagnostics n = row_count;
    if n<>0 then raise exception 'GTFS deletion allowed for %',role_name; end if;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon';
  if public.is_admin() or public.current_staff_role() is not null then raise exception 'Anonymous role resolution failed'; end if;
  begin
    perform public.list_staff_accounts();
    raise exception 'Anonymous account listing allowed';
  exception when insufficient_privilege then null; end;
  perform 1 from public.routes limit 1;
  execute 'reset role';
end $test$;
rollback;
