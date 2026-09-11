# TokTickIT — Sprint 3 Engineering Specification

Status: COMPLETE — all sections drafted (§1 Sprint Goal, §2 Stakeholder Request, §3 Scope, §4 FRs, §5 BRs, §6/§6a UI Summary + Authorization Matrix, §7 Data Changes, §8 API Contract, §9 ACs, §10 DoD, §11 Assumptions). Verify §7 field names against actual schema.prisma before implementation.

## 1. Sprint Goal
Sprint 3 moves TokTickIT from a single-user development demo into a real multi-role system. Requesters, IT Staff, and Administrators each authenticate with their own credentials and see only the navigation and actions their role permits, enforced server-side rather than by hiding buttons. IT Staff gain an operational Ticket Queue and Ticket Detail workflow to triage, claim, and progress tickets; Administrators gain a minimal User Management screen to provision and control accounts — replacing the temporary Requester selector with real, authenticated identity throughout the application.

## 2. Stakeholder Request
The temporary Requester selector was a development convenience and must be replaced with real login. Requesters keep using the Lab 2 ticket functions, but now under their authenticated identity instead of a picked-from-a-list stand-in. IT Staff get a working queue to find, claim, and progress tickets, talk to Requesters via Public Comments, and keep private Internal Notes. Administrators get a simple screen to create and manage accounts — nothing fancier than that. Every one of these operations must be enforced by the backend regardless of what the UI shows or hides.

## 3. Scope

**Included** — the five Sprint 3 areas only:
- Authentication, session handling, and mandatory first-login password change
- Role-based navigation and server-side authorization (Requester, IT Staff, Administrator)
- IT Staff Ticket Queue and Ticket Detail (ownership, IT Priority, status, Public Comments, Internal Notes)
- Requester regression (Lab 2 functions continue under real authenticated identity)
- Minimalist Administrator User Management (list, create, edit, activate/deactivate, reset initial password)

**Excluded** (per handout §4.2): email invitations/password-reset email, MFA, social login/SSO, self-registration, Actions Taken, SLA/escalation/notifications, dashboards/KPI analytics, multi-tenant/department structures, production deployment changes, multiple roles per user, user deletion/bulk operations/import-export/account history, extended user-profile management, email delivery of credentials, account unlocking/approval workflows, mandatory pagination/multi-column sort/multi-filter on the user list.

**Deliberate scope decision:** Ticket status transitions are role-gated (only IT Staff/Administrator may change status; see BR-21) but not restricted to a formal transition matrix — any active IT Staff/Administrator may set any of the required status values. This is a conscious simplification for Sprint 3, not an oversight.

## 4. Functional Requirements

| FR ID | Functional Requirement |
|---|---|
| FR-01 | Authenticate a user via email address and password. |
| FR-02 | Require a user flagged for mandatory password change to set a new password before accessing any other screen. |
| FR-03 | Provide a logout action that invalidates the current session. |
| FR-04 | Provide a current-user endpoint returning the authenticated user's id, name, and role. |
| FR-05 | Restrict navigation and available actions to those permitted for the authenticated user's role. |
| FR-06 | Enforce authorization server-side on every protected endpoint, independent of UI state. |
| FR-07 | Allow a Requester to create Tickets under their authenticated identity. |
| FR-08 | Restrict a Requester to viewing and managing only Tickets and Attachments they own. |
| FR-09 | Allow a Requester to post Public Comments on their own Tickets. |
| FR-10 | Allow a Requester to indicate a reported problem appears resolved, without changing formal status. |
| FR-11 | Provide IT Staff a shared Ticket Queue with search, filter, sort, and pagination. |
| FR-12 | Allow IT Staff to open Ticket Detail for any Ticket in the queue. |
| FR-13 | Allow IT Staff or Administrator to claim an unassigned Ticket or reassign an owned Ticket. |
| FR-14 | Allow IT Staff or Administrator to set or change a Ticket's IT Priority. |
| FR-15 | Allow IT Staff or Administrator to change a Ticket's status (see BR-21). |
| FR-16 | Allow IT Staff or Administrator to post Public Comments visible to the Requester. |
| FR-17 | Allow IT Staff or Administrator to create Internal Notes visible only to IT Staff/Administrator. |
| FR-18 | Reject a Requester's attempt to access Internal Note data. |
| FR-19 | Provide an Administrator a user list showing name, email, role, and status. |
| FR-20 | Allow an Administrator to search users by name/email and optionally filter by role. |
| FR-21 | Allow an Administrator to create a user with name, email, one role, and an initial password. |
| FR-22 | Allow an Administrator to edit a user's name, email, role, and activation state. |
| FR-23 | Allow an Administrator to set a new initial password, forcing a change at next login. |
| FR-24 | Allow an Administrator to activate/deactivate a user, subject to BR-08 and BR-10. |

## 5. Business Rules

Given directly by the handout (§4.4):

| BR ID | Business Rule |
|---|---|
| BR-01 | Only an active user with valid credentials may authenticate. |
| BR-02 | A user marked as requiring a password change cannot enter the normal application until a new valid password is saved. |
| BR-03 | The authenticated user identity, not a requesterId supplied by the client, determines ownership of Requester operations. |
| BR-04 | Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator. |
| BR-05 | A Requester may indicate that the problem appears resolved, but cannot formally set the Ticket to Resolved or Closed. |

Added for Sprint 3:

| BR ID | Business Rule |
|---|---|
| BR-06 | An Administrator may update a user's name, email address, role, and activation state, but the account is never deleted. |
| BR-07 | The system rejects user creation or update if the submitted email address already belongs to another user, active or inactive. |
| BR-08 | An Administrator cannot deactivate their own account. |
| BR-09 | Deactivation is the only mechanism for removing a user's access; no API or UI path permanently deletes a user record. |
| BR-10 | The system rejects any action that would leave zero active Administrator accounts. |
| BR-11 | An invalid login returns a generic "Invalid email or password" message, revealing neither which field was wrong nor whether the account exists. |
| BR-12 | Passwords are hashed before storage; plaintext passwords are never persisted or logged. |
| BR-13 | Logging out immediately invalidates the current session; subsequent requests with that session are treated as unauthenticated. |
| BR-14 | An inactive user cannot authenticate, even with correct credentials, and receives the same generic message as an incorrect-credentials attempt. |
| BR-15 | The current-user endpoint returns only the authenticated caller's own identity and role; it never trusts a client-supplied user id. |
| BR-16 | Only an active IT Staff or Administrator user may be set as a Ticket's owner; a Requester can never be assigned as Ticket Owner. |
| BR-17 | Any active IT Staff or Administrator may claim an unassigned Ticket or reassign an already-owned Ticket to another active IT Staff/Administrator. |
| BR-18 | IT Priority defaults to the Requester's Requested Priority at ticket creation and may only be changed afterward by IT Staff or Administrator. |
| BR-19 | A Public Comment is visible to the Requester who owns the ticket and to all IT Staff/Administrator accounts. |
| BR-20 | Internal Notes are visible only to IT Staff and Administrator; a Requester's request for Internal Note data is rejected without revealing note content or existence. |
| BR-21 | Only IT Staff or Administrator may change a Ticket's status; a Requester may never set status directly (see BR-05). No further restriction is placed on which status values IT Staff/Administrator may select. |
| BR-22 | Public Comment or Internal Note content that is empty or whitespace-only is rejected before persistence. |
| BR-23 | Unexpected server errors return a generic failure message with no stack trace, internal id, or raw database error text. |
| BR-24 | All Lab 2 Requester ticket/attachment operations continue to enforce ownership using the authenticated user's identity, never a client-supplied identifier. |

## 6. UI Specification Summary
Full detail in `docs/lab-03/ui-spec.md`. Summary of what's new/changed:
- **Login + mandatory Change Password** — new screens, replacing the Lab 2 Requester Selector entirely.
- **Application shell** — role-aware nav (Requester / IT Staff / Administrator), current user + role badge + Logout, replacing the "Change Requester" control.
- **Requester Ticket Detail** — extended with Public Comments and a "Mark Problem as Resolved" action; all other Lab 2 behavior (read-only grid, Attachments panel) unchanged.
- **IT Staff Ticket Queue** — new, 8-column desktop table (Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Status, Owner), card list on mobile.
- **IT Staff Ticket Detail** — extends Lab 2's Ticket Detail with editable Owner, IT Priority, Status, plus tabbed Public Comments / Internal Notes (visually distinct via a dedicated tint token).
- **Administrator User Management** — new list + create/edit side panel. Deliberately deviates from the handout mockup by replacing the "send password reset email" checkbox with a plain Initial Password field, since email delivery is out of scope (§4.2).
- New color tokens added for the 8 required statuses and for role badges (`ui-spec.md` §1–§3), additive to the Lab 2 token table.

## 6a. Authorization Matrix

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Create/view/manage own Tickets & Attachments | ✅ (own only) | ❌ | ❌ |
| Post Public Comments | ✅ (own tickets) | ✅ (any ticket) | ✅ (any ticket) |
| Mark "problem appears resolved" | ✅ | — | — |
| View IT Staff Ticket Queue / Ticket Detail | ❌ | ✅ | ✅ |
| Claim / reassign Ticket ownership | ❌ | ✅ | ✅ |
| Set IT Priority | ❌ | ✅ | ✅ |
| Change Ticket status | ❌ | ✅ | ✅ |
| Create/view Internal Notes | ❌ (403, no content leak) | ✅ | ✅ |
| View/create/edit users | ❌ | ❌ | ✅ |
| Deactivate own account | — | — | ❌ (BR-08) |
| Remove last active Administrator | — | — | ❌ (BR-10) |

## 7. Data Changes

**Assumption flagged:** the exact field names below assume Lab 2's Requester table was a simple lookup (id, name, email — no credentials). Verify against your actual `schema.prisma` before implementing; adjust names to match rather than renaming your existing model to fit this doc.

**User** (evolves Lab 2's Requester table):
- `id`, `name`, `email` (unique, indexed), `passwordHash`, `role` (enum: `REQUESTER` / `IT_STAFF` / `ADMINISTRATOR`), `isActive` (boolean), `mustChangePassword` (boolean), `createdAt`, `updatedAt`.
- Existing Requester rows: add the new columns, set `role = REQUESTER`, `isActive = true`, generate a documented local initial password per BR-02/seed requirements, `mustChangePassword = true`.

**Ticket** (extends Lab 2's Ticket — no existing rows or columns are dropped):
- Add `ownerId` (nullable FK → User, indexed) — null means unassigned.
- Add `itPriority` (same Priority enum as `requestedPriority`) — backfill existing rows with `itPriority = requestedPriority` on migration (BR-18).
- Expand the Status enum from Lab 2's single `NEW` value to all 8 required statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`); existing `NEW` rows remain valid without conversion.
- `requesterId` FK now points at the evolved User table instead of the old standalone Requester table.

**Comment** (new — Public Comments):
- `id`, `ticketId` (FK → Ticket, indexed), `authorId` (FK → User), `content` (text, non-empty per BR-22), `createdAt`.

**Note** (new — Internal Notes):
- `id`, `ticketId` (FK → Ticket, indexed), `authorId` (FK → User), `content` (text, non-empty per BR-22), `createdAt`.

**Migration order:** (1) add User columns + backfill role/active/password state, (2) add Ticket.ownerId + itPriority + backfill, (3) expand Status enum, (4) create Comment/Note tables, (5) re-point Ticket.requesterId FK if the underlying table was renamed rather than altered in place.

**Seed data:** per handout §5.3 — idempotent seed script producing ≥4 active + 1 inactive Requester, ≥3 active + 1 inactive IT Staff, ≥1 active Administrator, realistic Tickets spread across statuses/priorities/ownership, and example Comments/Notes with no sensitive content. Document seeded credentials as local-dev-only, never real secrets.

## 8. API Contract
Full detail in `docs/lab-03/api-spec.md` (17 endpoints). Summary:
- **Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` — session-cookie based (httpOnly, sameSite: lax), replacing the Lab 2 `X-Requester-Id` header entirely.
- **IT Staff**: queue retrieval with search/filter/sort/pagination, ticket detail retrieval, claim/reassign, IT Priority update, status update, plus shared Public Comment endpoints and IT-Staff-only Internal Note endpoints.
- **Administrator**: user list (search + optional role filter, no pagination per §4.2), create user, edit user, set new initial password.
- All Lab 2 Requester-scoped endpoints continue unchanged in shape, resolving identity from the session instead of the removed header.
- Status codes add `403` (authenticated but forbidden by role/ownership) alongside Lab 2's existing `400/401/404/409/500` pattern.

## 9. Acceptance Criteria

| AC ID | Criterion | Maps to |
|---|---|---|
| AC-01 | Valid credentials → authenticated session + correct role returned | FR-01, BR-01 |
| AC-02 | Invalid credentials → generic error, no leak of which field failed | BR-11 |
| AC-03 | Inactive account, correct credentials → same generic error as AC-02 | BR-14 |
| AC-04 | User flagged for password change is blocked from all other screens until new password saved | FR-02, BR-02 |
| AC-05 | Logout invalidates session; subsequent request is unauthenticated | FR-03, BR-13 |
| AC-06 | Current-user endpoint returns only the caller's own identity, ignoring any client-supplied id | FR-04, BR-15 |
| AC-07 | Role-based nav never renders destinations outside the user's role | FR-05 |
| AC-08 | Direct API call to an unauthorized endpoint returns 403 even with no UI control shown | FR-06 |
| AC-09 | Requester creates a ticket under their authenticated identity even if another requesterId is supplied | FR-07, BR-03 |
| AC-10 | Requester cannot view or modify another Requester's ticket | FR-08 |
| AC-11 | Requester's Public Comment is visible to IT Staff/Administrator | FR-09, BR-19 |
| AC-12 | Requester marking "appears resolved" does not change formal status | FR-10, BR-05 |
| AC-13 | Queue search/filter/sort/pagination return correct, matching results | FR-11 |
| AC-14 | IT Staff claims an unassigned ticket; ownership updates and persists | FR-13, BR-16, BR-17 |
| AC-15 | IT Staff changes IT Priority; value persists and is distinct from Requested Priority | FR-14, BR-18 |
| AC-16 | IT Staff changes status successfully; Requester's direct attempt to change status is rejected | FR-15, BR-21 |
| AC-17 | Requester's request for Internal Note data is rejected without exposing note content or existence | FR-17, FR-18, BR-20 |
| AC-18 | Empty or whitespace-only comment/note is rejected before save | BR-22 |
| AC-19 | Creating/editing a user with a duplicate email is rejected | FR-21, BR-07 |
| AC-20 | Administrator's attempt to deactivate their own account is rejected | FR-24, BR-08 |
| AC-21 | Deactivating the last active Administrator is rejected | BR-10 |
| AC-22 | Admin-set new initial password forces password change at next login | FR-23, BR-02 |
| AC-23 | Unexpected server error returns a generic message, no stack trace/internal detail | BR-23 |
| AC-24 | Lab 2 Requester ticket/attachment ownership still enforces via authenticated identity post-migration | FR-08, BR-24 |

## 10. Definition of Done
- All 24 FRs implemented and all 24 ACs passing, traced in `tests.md`.
- Full test suite green: unit, API/integration, UI component, responsive, security/authorization, migration/regression, E2E.
- Every protected endpoint enforces authorization server-side (verified by direct API test, not just UI inspection).
- Lab 2 Requester functions regression-tested and passing under real authenticated identity.
- Seed data present, idempotent, and matches §5.3 minimums.
- `specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `ai-use.md`, `reviewer.md` all complete and internally consistent.
- Visual/responsive checklist (ui-spec.md §12/Lab 2 §16) passed across desktop/tablet/mobile for every new/changed screen.
- `lab3-staging` merged into `main` via reviewed PR, with reviewer.md showing approval.

## 11. Assumptions and Decisions
- **BR-21 simplification**: Ticket status changes are role-gated (IT Staff/Administrator only) but not restricted by a formal transition matrix — any required status may be set by an authorized role. Deliberate scope reduction, confirmed with the team, not an oversight.
- **Auth mechanism**: server-side session cookie (httpOnly, sameSite: lax) chosen over JWT — no stateless-scaling requirement in scope, and simplest to reason about for logout invalidation (BR-13).
- **Admin Create User panel**: replaces the mockup's "send password reset email" checkbox with a plain Initial Password field, since email delivery of credentials is explicitly excluded (§4.2).
- **Data model field names**: §7 assumes Lab 2's Requester table had no credential fields; verify against the actual `schema.prisma` before implementing and adjust naming to match your existing schema rather than this doc.
- **AC scope**: Acceptance Criteria were written only for FR/BR pairs with an independently testable, observable behavior (e.g., BR-12 password hashing has no standalone AC — it's covered implicitly by AC-01/AC-02 passing).