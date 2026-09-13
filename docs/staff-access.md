# Staff roles and account management

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

## Managing staff

Sign in as an admin, then open **Account Management**.

1. Enter the email of an existing Supabase Authentication user.
2. Choose Admin, Editor, or Operator and save access.
3. Use **Edit access** to change a role or disable/re-enable staff access.

New Auth users must first be created or invited through Supabase Authentication.
This page does not send invitations, reset passwords, or delete Auth accounts.
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

No GitHub push is performed by this implementation. Environment files are
ignored by Git; `.env.example` remains available for setup.
