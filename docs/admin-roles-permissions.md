# Admin Roles and Permission Contract

Status: Phase 1 design baseline. This document defines the target access model before changing authentication, database records, or enforcement code.

## Goals

- Keep one Admin Portal and one existing Alumni account per person.
- Keep alumni profile data separate from administrative assignments.
- Treat the server as the authority for administrative roles and scope.
- Enforce authorization on every protected server/API and Firestore operation; hiding a button is not authorization.
- Roll out in small, backward-compatible phases so existing sign-in and directory behavior remain available.

## Canonical roles

| Canonical role | Scope | Allowed capabilities | Explicit restrictions |
| --- | --- | --- | --- |
| **SUPER_ADMIN** | Entire platform | Full platform administration; appoint/revoke Co-admins and institution admins; manage all universities/departments; review requests; inspect audit logs and security settings | Must be granted only through trusted server-side configuration or a trusted bootstrap process. Never assign from public signup or client-provided role fields. Prevent removal/demotion of the last active Super Admin. |
| **CO_ADMIN** | Entire platform, excluding Super Admin governance | Nearly all routine platform administration; manage all universities/departments; approve/revoke University Admin and Department Admin assignments; review requests | Cannot create, promote, demote, or revoke any Super Admin; cannot revoke another Co-admin unless explicitly authorized by a Super Admin policy. |
| **UNIVERSITY_ADMIN** | One exact university | Edit that university and its departments; manage department records and permitted directory data within that university | Cannot manage other universities or global security/admin settings. University scope must be stored and checked server-side. |
| **DEPARTMENT_ADMIN** | One exact university + one exact department | Edit permitted records for the assigned department only | Cannot manage other departments, even at the same university; cannot manage university-wide or central settings. Both university and department scope must match. |
| **USER** | No administrative scope | Use ordinary AlumniSphere features allowed to the account | No administrative access unless a separate, active assignment is approved. |

## Permission invariants

1. **No self-elevation:** client input, editable profile fields, local storage, and public signup cannot grant or modify an administrative role.
2. **Approval is explicit:** Co-admin signup creates a pending application, not an active role. Institution admin requests are attached to the existing authenticated account and remain pending until approved.
3. **Scope is mandatory:** UNIVERSITY_ADMIN requires one assignedUniversity; DEPARTMENT_ADMIN requires both assignedUniversity and assignedDepartment. Missing or mismatched scope denies access.
4. **Role and profile are separate:** a person may be both an alumnus and an administrator. Revoking an admin assignment must not delete their ordinary account or alumni profile.
5. **One portal, role-specific dashboard:** the same Admin Portal routes an authenticated user to the dashboard authorized by the server's active role and scope.
6. **Default deny:** protected writes are denied unless a matching server-side policy explicitly allows them.
7. **Audit sensitive changes:** role assignments/revocations, approvals/rejections, denied privileged actions, and administrative data changes should record actor, target, scope, timestamp, and outcome without logging passwords or bearer tokens.
8. **Revocation takes effect:** each protected request must validate an active session and current assignment, or use a revocation mechanism that prevents stale sessions from retaining privileges.
9. **Private contact details:** admin directories show only fields approved for that audience; private email addresses are not automatically public.
10. **Preserve the last Super Admin:** changes must not accidentally lock the platform out of all Super Admin control.

## Existing implementation compatibility findings

The current code contains two role vocabularies that must be reconciled carefully:

- The server-side admin store/session model uses USER, ADMIN, and SUPER_ADMIN.
- Firestore rules and user profiles also refer to UNIVERSITY_ADMIN and DEPARTMENT_ADMIN, with assignedUniversity and assignedDepartment.
- The current admin login/dashboard flow is a separate server-session flow, while regular Alumni accounts use Firebase Authentication.

Do not replace these vocabularies in a single destructive edit. During migration, define an explicit compatibility mapping and update the server, client types, APIs, persisted records, and Firestore rules in coordinated, testable steps. Existing trusted Super Admin bootstrap identities and login behavior must continue to work during the transition.

## Recommended implementation sequence

1. Establish and review this role/permission contract.
2. Add canonical server types, scope fields, and a compatibility mapper without changing current login behavior.
3. Add centralized server authorization helpers and apply them endpoint-by-endpoint, starting with university/department writes.
4. Add approved assignment/request records and Super Admin/Co-admin governance endpoints.
5. Connect the single Admin Portal to role-specific dashboards and scoped navigation.
6. Align Firestore rules and client types; test owner edits, role escalation attempts, cross-university access, cross-department access, and revocation.
7. Run type-check/build and regression tests before merging or deploying.

## Acceptance checklist for subsequent phases

- [ ] A public user cannot grant themselves any admin role.
- [ ] Pending or rejected applications cannot access an admin dashboard or protected endpoint.
- [ ] Co-admin cannot change Super Admin membership or privileges.
- [ ] University Admin cannot mutate a different university.
- [ ] Department Admin cannot mutate another department, including one in the same university.
- [ ] Revoking an assignment removes administrative access without deleting the ordinary Alumni account.
- [ ] Existing Super Admin login, password recovery, and current public features continue to work.
- [ ] Firestore rules and server API checks enforce the same scope contract.
