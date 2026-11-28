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
