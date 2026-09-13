# User management and staff roles

The source of staff permissions is `public.admin_users`: one role per user,
plus `is_active`. Existing staff records keep their roles and start active.

| Capability                                             | Admin | Editor | Operator |
| ------------------------------------------------------ | ----- | ------ | -------- |
| GTFS routes, stops, trips, shapes, schedules, metadata | Yes   | Yes    | No       |
| Reports, route suggestions, distance and train fares   | Yes   | No     | Yes      |
| Permanently delete operational records                 | Yes   | No     | No       |
| Assign roles and enable/disable staff access           | Yes   | No     | No       |

Public transit reads and passenger submissions remain available under the existing
policies. An editor can still read public fares or submit a passenger report;
they cannot use operational staff privileges.

## Managing passengers and staff

Sign in as an admin, then open **User Management**.

1. The directory includes passengers and staff, including anonymous and phone
   accounts. Search by email, name, phone, or user ID; filter by role and status.
   Search and pagination run on the server, with 25 users per page.
2. **Create user** takes an email, initial password, and Passenger/Admin/Editor/Operator
   role. It creates an email-confirmed login using the Auth Admin API and sends no
   email. Passwords must be at least 12 characters and at most 72 UTF-8 bytes.
   Existing accounts are rejected rather than having their passwords overwritten.
3. **Manage access** changes an existing user's role. Choosing **Passenger**
   removes their staff membership without deleting their login or passenger data.
   Anonymous and email-less accounts cannot receive staff roles.
4. Staff access can be disabled or re-enabled independently of passenger access.
   You cannot change your own staff role or disable your own staff access.
5. **Invite staff**, **Resend invitation**, and staff **Reset password** actions
   remain available once the email configuration below is complete.

The table shows creation time, confirmation/access status, and last sign-in.
Existing Auth bans are displayed as **Account suspended**; this page does not
add or remove bans or permanently delete users. The sidebar Change password
link remains removed.
Disabling staff access revokes staff permissions, including for existing tokens,
but preserves the user's passenger account and data.

You cannot change your own staff access. Account mutations are serialized and
recheck the caller's role, preventing concurrent demotions from removing all admins.
Changes are recorded in `private.staff_access_audit`, which is deliberately
inaccessible to browser clients. An RLS advisory about this table having no
policies is expected: only the guarded private function writes to it.

## Enforcement

Database policies resolve the caller's current role on each request, rather than
trusting editable user metadata or stale JWT role claims. Shared-header GTFS
write policies have been removed. GTFS RPCs run as the caller and obey RLS.
Public account-management RPC wrappers call private functions that explicitly
verify admin access. Clients cannot directly write the membership table.

The admin app checks access on session restoration, window focus, and every
30 seconds. Role-based navigation and route guards prevent opening restricted
pages directly. Operators do not see permanent-delete buttons.

The separate `para-gtfs-editor` repository also has authentication changes in
`JavaScript/auth.js` and `JavaScript/supabaseClient.js`. Review and push those
changes separately so its interface matches the database permissions.

## Deployment and verification

Migration `20260913002135_staff_roles_and_account_management.sql` has been
applied to the linked ParaV3 project. It is an incremental migration for the
existing PARA schema, not a full database bootstrap. Do not manually replay it
on the same project.

- `npm test`: role/navigation permission tests.
- `npm run lint` and `npm run build`: frontend checks.
- `supabase/tests/staff_roles.sql`: transactional database permission tests.
  Run using the Supabase SQL editor as the database owner. All test writes roll
  back. Tests require two existing staff accounts and at least one distance fare.

The SQL tests check admins, editors, operators, disabled users, nonstaff users,
anonymous users, self-demotion, invalid roles, direct membership writes, GTFS
mutations/RPCs, operational writes, and account-management authorization.

## Invitation and password-reset deployment

The incremental `20260913005353_staff_account_details.sql` migration and
`manage-staff` Edge Function are deployed to ParaV3. The additional SQL test
`supabase/tests/staff_account_details.sql` verifies admin-only account details.

Before sending emails:

1. Set the Edge Function secret `STAFF_APP_URL` to the canonical PARA Admin
   base URL, including its path if hosted under a subdirectory.
2. Add that URL with `?account=password` to Supabase Authentication's allowed
   redirect URLs. For local tests, use `http://localhost:5173/?account=password`.
3. Configure Supabase Auth email delivery. The built-in email service has
   recipient/rate limits; production staff invitations generally need custom SMTP.
4. Keep the confirmation and recovery email links pointed at
   `{{ .ConfirmationURL }}`, so Supabase verifies the token before redirecting.

The handler refuses to send when `STAFF_APP_URL` is missing. It does not trust
a browser-supplied redirect URL. Service credentials remain in the function
environment. JWT gateway verification is disabled because the handler performs
Auth `getUser()` validation and a current database role check on every request;
unauthenticated callers are rejected before any privileged client is created.

An invitation and its role assignment span Auth and Postgres. If delivery
succeeds but role assignment fails, the UI reports partial success and offers
**Manage access** in the directory to finish setup. It never reports full success in
that case or deletes the newly invited account as automatic cleanup.

`npm test` includes mocked email-service tests for authorization, invalid input,
duplicate accounts, partial failures, redirects, and delivery limits. These tests
send no real email. `node scripts/verify-staff-endpoint.mjs` checks the deployed
endpoint's unauthenticated rejection and CORS responses without sending email.

No GitHub push is performed by this implementation. Environment files are
ignored by Git; `.env.example` remains available for setup.

## Combined directory deployment

Migration `20260913020200_user_management_directory.sql` adds guarded
`list_managed_users` and `set_managed_user_access` RPCs. Both use private
functions that verify the caller's current admin role. The directory returns
only the fields displayed in the UI, never password hashes or tokens.
Role changes are audited in the existing private staff access log.

The `manage-staff` Edge Function also supports `create_user`. Passenger
creation does not add a staff membership. Staff creation assigns the role
through the caller's guarded RPC. If that second step fails, the account
remains a passenger and the UI explains how to finish assigning access.
It does not need email or redirect configuration to create password-based users.

`supabase/tests/user_management.sql` tests directory access, pagination,
passenger search, promotion, staff disabling/removal, audit entries, anonymous
promotion denial, and self-demotion protection. Fixtures are rolled back.
`npm test` includes simulated Auth account creation and duplicate/invalid
input/authorization/partial-success tests without creating real users.
