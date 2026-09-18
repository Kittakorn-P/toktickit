# TokTickIT — Sprint 3 Test Plan & Traceability (tests.md)

Status: COMPLETE — all planned test coverage implemented and passing as of Issue 5 close.

---

## Issue 2 — Auth & Migration Foundation

| Test ID | Type | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, BR-01 | Valid login | Authenticated session + correct role returned | server/tests/lab-03/auth.api.test.ts | Pass |
| API-02 | API | BR-11 | Invalid password login | Generic `INVALID_CREDENTIALS`, no field-specific leak | server/tests/lab-03/auth.api.test.ts | Pass |
| API-03 | API | AC-03, BR-14 | Inactive account login | Identical generic error to API-02 (verified byte-identical response) | server/tests/lab-03/auth.api.test.ts | Pass |
| API-04 | API | AC-05, BR-13 | Logout | Session destroyed; subsequent `/api/auth/me` with same cookie returns 401 | server/tests/lab-03/auth.api.test.ts | Pass |
| API-05 | API | AC-04, BR-02 | Mandatory password change | `mustChangePassword` blocks nothing on `/me` or `/change-password` itself, flips to false after valid change | server/tests/lab-03/auth.api.test.ts | Pass |
| API-06 | API | AC-06, BR-15 | Current-user scoping | `/api/auth/me` returns only the session's own identity | server/tests/lab-03/auth.api.test.ts | Pass |
| API-07 | API | BR-06 (mid-session deactivation) | User deactivated after login | Next request with the same session returns 401 | server/tests/lab-02/requester-deactivation.api.test.ts | Pass |
| API-08 | API | BR-06 (mid-session deactivation, ticket creation path) | User deactivated after login attempts to create a Ticket | 401, no ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pass |

All six previously-manual auth tests (API-01–06) were automated in Issue 5 into a
dedicated `server/tests/lab-03/auth.api.test.ts`.

---

## Issue 3 — IT Staff Ticket Queue + Ticket Detail

| Test ID | Type | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-09 | API | FR-06 | Queue authorization | 401 with no session, 403 for a Requester, 200 for IT Staff | server/tests/lab-03/staff-queue.api.test.ts | Pass |
| API-10 | API | AC-13 | Queue is cross-Requester | IT Staff sees tickets from all Requesters, not scoped to one | server/tests/lab-03/staff-queue.api.test.ts | Pass |
| API-11 | API | AC-13 | Queue search/filter/pagination | Search text, `owner=unassigned` filter, invalid pagination fallback all behave correctly | server/tests/lab-03/staff-queue.api.test.ts | Pass |
| API-12 | API | AC-14, BR-16, BR-17 | Claim / reassign | Unassigned ticket claimable; already-owned ticket reassignable by another IT Staff; invalid ownerId rejected (400); Requester claim attempt rejected (403) | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass |
| API-13 | API | AC-15, BR-18 | IT Priority update | Updates independently of Requested Priority; invalid value rejected | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass |
| API-14 | API | AC-16, BR-21 | Status update | IT Staff can change status; Requester's direct attempt rejected (403); invalid status rejected (400) | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass |
| API-15 | API | AC-11, BR-19, BR-22 | Public Comments | Owning Requester and IT Staff can both post/read; non-owning Requester gets 404; empty content rejected | server/tests/lab-03/comments-notes.api.test.ts | Pass |
| API-16 | API | AC-17, BR-04, BR-20, BR-22 | Internal Notes | IT Staff can post/read; Requester's read/post rejected (403) without exposing note content; empty content rejected | server/tests/lab-03/comments-notes.api.test.ts | Pass |
| UI-01 | UI Component | — | StaffQueue empty/loaded/no-results states, unassigned label | All four states render correctly | client/tests/lab-03/StaffQueue.test.tsx | Pass |
| UI-02 | UI Component | — | StaffTicketDetail claim action, Comments/Notes tab separation, not-found state | Claim button calls API correctly; tabs show distinct content; not-found renders | client/tests/lab-03/StaffTicketDetail.test.tsx | Pass |

---

## Issue 4 — Administrator User Management

| Test ID | Type | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-17 | API | FR-19, FR-20 | User list authorization and filtering | 401 with no session, 403 for non-Administrator, 200 + role filter for Administrator | server/tests/lab-03/users-admin.api.test.ts | Pass |
| API-18 | API | AC-19, BR-07 | Create user | Valid creation returns `mustChangePassword: true`; duplicate email rejected (409); weak password rejected (400) with field-level error | server/tests/lab-03/users-admin.api.test.ts | Pass |
| API-19 | API | AC-20, BR-08 | Edit user, self-deactivation | Name/email/role/activation editable; Administrator's own deactivation rejected (409) | server/tests/lab-03/users-admin.api.test.ts | Pass |
| API-20 | API | BR-10 | Last active Administrator protection | Self role-change away from Administrator rejected (409) when it's the last active one; succeeds when another remains | server/tests/lab-03/users-admin.api.test.ts | Pass |
| API-21 | API | AC-22, BR-02 | Set new initial password | Returns `mustChangePassword: true` | server/tests/lab-03/users-admin.api.test.ts | Pass |
| UI-03 | UI Component | — | AdminUsers list, self-account Active-toggle disabling, create panel submission | List renders; toggle disabled when editing self; createAdminUser called with entered values | client/tests/lab-03/AdminUsers.test.tsx | Pass |

**Note on BR-10 test design:** since `/api/admin/*` requires the caller to already be an
active Administrator, a *non-self* deactivation can never actually drive the active-admin
count to zero (the actor is always counted as active). BR-08 already blocks self-deactivation
unconditionally. The one real gap BR-10 closes beyond BR-08 is an Administrator changing
their own *role* away from Administrator while being the last one — that's the scenario
API-20 isolates and tests, using a temporary deactivation of all other active admins for
the duration of the test only, restored immediately after (see the test's `finally` block).

---

## Issue 5 — Regression, QA & Release

### Backend test rewrite (header → session auth)
All 18 previously-stale Lab 2 tests (tracked in the prior version of this doc's "Known
Debt" table) were rewritten to use real login + session cookies instead of
`X-Requester-Id`, via a shared `server/tests/helpers/testUser.ts` helper
(`createTestUser`, `loginTestUser`, `cleanupTestUser`). All now pass:

| File | Tests | Status |
|---|---|---|
| `attachments.api.test.ts` | 8 | Pass |
| `create-ticket.api.test.ts` | 8 | Pass |
| `my-tickets.api.test.ts` | 5 | Pass |

The `ECONNRESET` failure on the over-5MB upload test (caused by `requireAuth` rejecting
before multer finished streaming the body under header-auth) resolved automatically once
rewritten to a real session — no separate fix needed.

### Full backend suite
70/70 tests passing across all `server/tests/` files (Lab 1, Lab 2 rewritten, Lab 3 new).

### Full frontend suite
30/30 tests passing across all `client/tests/` files, including 5 new Lab 3 component
test files (`Login`, `ChangePassword`, `StaffQueue`, `StaffTicketDetail`, `AdminUsers`).

**Regression finding:** writing `Login.test.tsx`, `ChangePassword.test.tsx`, and
`AdminUsers.test.tsx` surfaced a real accessibility defect — none of those forms had
`htmlFor`/`id` pairing between `<label>` and its input, meaning `getByLabelText` (and a
real screen reader) couldn't associate them. Fixed in all three components; ui-spec.md
§15 compliance restored.

### Orphaned test-user check
Repo-wide grep for direct `prisma.user.create`/`upsert` in test files confirmed every
creation site pairs with a cleanup step (either the shared helper's `cleanupTestUser` or
a matching `prisma.user.delete`). No leaks remain.

### E2E / Responsive & Visual QA
Automated via `e2e/lab-03/responsive.spec.ts` (Playwright), extending Lab 2's existing
`responsive.spec.ts` pattern. Captures desktop/tablet/mobile screenshots for Login, Staff
Queue, Staff Ticket Detail, and Admin User Management (list + create panel) into
`artifacts/lab-03/screenshots/`.

**Regression findings from this pass:**
- `Home.tsx`'s post-login redirect had no dedicated branch for `ADMINISTRATOR` — it fell
  through to the IT Staff `/queue` destination. Fixed with an explicit
  `ADMINISTRATOR → /admin/users` branch.
- `AppShell.tsx` had no mobile hamburger collapse, causing nav overlap at mobile width —
  violates ui-spec.md §6's inherited Lab 2 requirement. Fixed with a `d-md-none` toggle
  button and collapsible menu.
- `AdminUsers.tsx`'s user table had no responsive wrapper, risking horizontal page
  overflow on narrow screens — wrapped in `.table-responsive` per ui-spec.md §14's
  "no horizontal scrolling anywhere" rule.

### Authorization bugs found and fixed during Issues 3–4 (regression-relevant)
Two related bugs, both caused by Express matching routes by path *prefix* rather than
exact match, where a broadly-mounted router's blanket middleware intercepted requests
meant for a more specific router mounted later:
- `notesRouter`'s blanket `requireRole("IT_STAFF", "ADMINISTRATOR")` was incorrectly
  rejecting plain `GET /api/tickets` requests from Requesters, since `notesRouter` was
  mounted at the shared `/api/tickets` prefix. Fixed by moving the role check from the
  router-level `.use()` down to each individual route.
- `attachmentsRouter`, mounted at the bare `/api` prefix, was silently intercepting
  `/api/admin/*` requests before they reached `adminRouter` (which was mounted later),
  rejecting Administrators with `requireRole("REQUESTER")`. Fixed by reordering
  `app.ts`'s mount sequence so `adminRouter` registers before `attachmentsRouter`.

Both are documented here as regression-test-relevant since they represent a repeatable
class of bug (broad-prefix router mounted before a more specific one) worth checking for
if new routers are added in future work.

### Definition of Done — final status
- [x] All 24 FRs implemented and all 24 ACs passing
- [x] Full test suite green: unit, API/integration, UI component, security/authorization
- [x] Every protected endpoint enforces authorization server-side (verified by direct
      API test, not just UI inspection — see API-09, API-14, API-16, API-17)
- [x] Lab 2 Requester functions regression-tested and passing under real authenticated
      identity
- [x] Seed data present, idempotent, matches §5.3 minimums
- [x] `specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `ai-use.md`,
      `reviewer.md` complete
- [x] Visual/responsive checklist passed across desktop/tablet/mobile for every
      new/changed screen (screenshots in `artifacts/lab-03/screenshots/`)
- [ ] `lab3-staging` merged into `main` via reviewed PR — pending final release step