create function private.list_staff_account_details()
returns table(user_id uuid, email text, role text, is_active boolean, created_at timestamptz,
  email_confirmed_at timestamptz, invited_at timestamptz, last_sign_in_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select a.user_id, u.email::text, a.role, a.is_active, a.created_at,
    u.email_confirmed_at, u.invited_at, u.last_sign_in_at
    from public.admin_users a join auth.users u on u.id=a.user_id order by lower(u.email);
end $$;
create function public.list_staff_account_details()
returns table(user_id uuid, email text, role text, is_active boolean, created_at timestamptz,
  email_confirmed_at timestamptz, invited_at timestamptz, last_sign_in_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.list_staff_account_details() $$;
revoke all on function private.list_staff_account_details(), public.list_staff_account_details() from public, anon;
grant execute on function private.list_staff_account_details(), public.list_staff_account_details() to authenticated;
