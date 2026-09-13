begin;
do $test$
declare actor uuid; staff_role text; row_total bigint;
begin
  select user_id into actor from public.admin_users where role='admin' and is_active limit 1;
  if actor is null then raise exception 'An existing admin is required'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into row_total from public.list_staff_account_details();
  if row_total=0 then raise exception 'Admin details lookup failed'; end if;
  execute 'reset role';
  foreach staff_role in array array['operator','editor']
  loop
    update public.admin_users set role=staff_role where user_id=actor;
    execute 'set local role authenticated';
    begin
      perform public.list_staff_account_details();
      raise exception 'Non-admin could read account details';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
  end loop;
  update public.admin_users set role='admin', is_active=false where user_id=actor;
  execute 'set local role authenticated';
  begin
    perform public.list_staff_account_details();
    raise exception 'Disabled admin could read account details';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon';
  begin
    perform public.list_staff_account_details();
    raise exception 'Anonymous could read account details';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $test$;
rollback;
