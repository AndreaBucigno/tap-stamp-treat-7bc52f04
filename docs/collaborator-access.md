# Collaborator access per venue

## Goal

Allow the platform administrator to grant each venue owner permission to manage collaborators and configure a per-venue maximum. The permission is independent from `manager_access` and from platform-admin staff management.

## Product behavior

- New venues default to collaborator management disabled.
- The platform administrator opens a venue in the admin panel and can enable/disable collaborator management and set a maximum from 1 to 50.
- The venue owner sees the Collaborators section only while the permission is enabled.
- The owner can add and remove collaborators belonging to their own venue.
- Show usage as `X / N collaborators`.
- Disabling the permission blocks new additions but does not delete existing collaborators. The owner should retain the ability to remove them.
- Collaborators cannot add/remove other collaborators or change the venue's permission.
- The platform administrator's existing ability to inspect/manage staff remains a separate administrative capability.

## Database contract (must be implemented before wiring the UI)

Use the existing database conventions and verify actual table/function names before implementation. Do not assume these proposed names already exist.

1. Store a per-venue boolean permission (default `false`) and integer maximum (default a safe value, constrained to 1–50).
2. Expose a read operation for the authenticated venue owner that returns the permission, maximum, and current active collaborator count. It must not expose another venue's configuration.
3. Expose an admin-only operation to update the permission and maximum. Authorization must be checked in the database, not trusted from the client.
4. Enforce additions in the existing `add_staff` operation (and any other staff-creation path) using a transaction/row lock on the venue row. Reject when disabled or when the current count is at the maximum. This must be atomic to prevent concurrent requests from exceeding the limit.
5. Keep removals available to the owner even when additions are disabled or the venue is at its limit.
6. Ensure direct table writes cannot bypass the permission or limit. Keep the existing owner/staff/admin authorization boundaries.
7. Regenerate Supabase types through the project's supported workflow; do not hand-edit generated type files.

Suggested error semantics: clear, stable errors for permission disabled, limit reached, and unauthorized access. Do not return sensitive venue or user data to unauthorized callers.

## Frontend work after the database contract exists

### Platform admin
- Add a configuration panel to each venue's expanded admin card.
- Show current permission state and maximum.
- Allow enable/disable and maximum editing (1–50).
- Save through the admin-only database operation, then refresh venue data.
- Keep the existing platform-admin staff tools separate and clearly labelled.

### Venue owner
- Fetch the permission and usage from the owner-scoped read operation.
- Hide the Collaborators navigation item and section when disabled, except preserve a clear non-destructive explanation if the owner needs to know why it is unavailable.
- When enabled, show `X / N` usage, disable the add form at the limit, and show the database error if an addition is rejected.
- Keep removal available while disabled.
- Do not rely on client-side checks as security enforcement.

## Acceptance tests

- New venue: permission disabled by default.
- Non-admin cannot change permission or maximum.
- Admin can enable, disable, and set a valid maximum.
- Invalid maximum (below 1 or above 50) is rejected by the database.
- Owner can read only their own venue's setting and count.
- Owner cannot add while permission is disabled.
- Owner can add below the limit.
- Owner cannot add at the limit.
- Two simultaneous additions when one slot remains result in exactly one success.
- Owner can remove a collaborator when disabled and when at the limit.
- Disabling permission preserves existing collaborator records.
- Collaborator cannot manage staff or change settings.
- Owner of another venue cannot add/remove staff in this venue.
- Platform admin's existing staff-management flow continues to work independently.

## Repository constraints

- Follow `AGENTS.md`: do not create or edit `supabase/migrations/` or `drizzle/`; database/schema changes must be made through Lovable.
- Do not hand-edit generated Supabase types.
- Keep changes on this feature branch and do not rewrite published Git history.
- Run lint, tests, and build after implementation.


## Implementation notes from the current schema (read-only audit)

The current schema has these relevant objects:

- `venues`: one row per venue, with `owner_id` unique.
- `venue_staff`: collaborator rows; authenticated users have SELECT only, while mutations go through SECURITY DEFINER RPCs.
- `add_staff(_email text)`: owner-facing insertion RPC. It currently finds the owner's venue, checks the account is eligible, then inserts. It does **not** currently check a venue permission or quota, and it does not lock the venue row.
- `remove_staff(_id uuid)`: owner-facing removal RPC. It deletes only when the collaborator belongs to the caller's venue.
- `admin_add_staff(_venue uuid, _email text)` and `admin_remove_staff(_id uuid)`: platform-admin staff tools, separately protected by `has_role(auth.uid(), 'admin')`.
- `admin_venues()`: admin overview currently returns venue details and aggregate counts, but not collaborator entitlement settings.

The migrations are under `drizzle/migrations/`, but `AGENTS.md` explicitly forbids editing them by hand. This audit is read-only; schema work must be requested through Lovable.

## Proposed concrete database API

Names below are proposed and must be checked for collisions before Lovable creates them.

### Venue columns

- `staff_management_enabled boolean NOT NULL DEFAULT false`
- `staff_limit integer NOT NULL DEFAULT 5 CHECK (staff_limit BETWEEN 1 AND 50)`

Existing venues receive the safe default (disabled). New venues also remain disabled until explicitly enabled by an admin.

### RPCs

- `my_staff_settings()`: authenticated owner only; returns one row containing `enabled`, `staff_limit`, and `staff_count` for the caller's venue. A collaborator or anonymous caller must not receive the owner's settings.
- `admin_update_staff_settings(_venue uuid, _enabled boolean, _staff_limit integer)`: admin-only; validates the limit and updates only the requested venue. It should lock the venue row while updating.
- `add_staff(_email text)`: preserve its existing signature and account eligibility checks. Lock the owner's venue row with `FOR UPDATE`, then reject if disabled or if the current collaborator count is already at the configured limit, before inserting. The lock must be acquired before counting so concurrent adds serialize.
- `remove_staff(_id uuid)`: preserve owner-scoped removal and deliberately do not require the permission to be enabled.
- `admin_add_staff(_venue uuid, _email text)`: keep admin authorization separate, but apply the same enabled/quota rules to every insertion path so the configured maximum cannot be bypassed through the admin panel. If a platform support override is desired later, it must be a distinct, explicit audited operation rather than a silent bypass.

### Important concurrency detail

The `add_staff` transaction should lock the venue row first, then count rows in `venue_staff`, then insert. Every staff-creation path must follow the same lock order. Merely checking the count in React or issuing an unlocked COUNT query is not sufficient. The venue row is the serialization point for all additions to that venue.

### Test harness constraints

The existing live test file is `src/test/loyalty-live-security.test.ts`. It creates isolated auth users and venues using the service-role client and is skipped unless `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are present. It currently seeds a collaborator directly with the service-role client, which is appropriate for test setup but does not exercise the owner-facing invitation RPC. Extend it only after Lovable has generated the new database types and applied the schema.

Add a dedicated live test (or a clearly isolated section) for the new settings API. Use at least two venues and owner/staff/admin sessions. For the race test, configure a limit of 1, start with zero collaborators, call `add_staff` twice concurrently using two distinct eligible accounts, and assert exactly one succeeds and the final count is 1. Always clean up venues, staff, manager access, and auth users in `finally`.

Do not run live tests against production data. Use a disposable Supabase test project with the three required environment variables.
