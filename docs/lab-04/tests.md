# TokTickIT — Sprint 4 Test Plan and Results

> **Revision note:** the plan was written before implementation. It now lists the tests that
> exist, with their real file paths and results. Rows the plan called for but that were not
> written are shown as **Not written**, with the reason. Test IDs that appear in the test
> names are kept so a failure can be traced back here.

## Results summary (final branch)

| Suite | Command | Lab 4 tests | Whole suite |
|---|---|---|---|
| Backend (Vitest + Supertest) | `cd server && npx vitest run` | 47 | 118 tests, 18 files, all passing |
| Frontend (Vitest + React Testing Library) | `cd client && npx vitest run` | 37 | 67 tests, all passing |
| End-to-end (Playwright) | `cd e2e && npx playwright test` | 17 | 42 tests (Labs 2–4), all passing |

Test files: `server/tests/lab-04/`, `client/tests/lab-04/`, `e2e/lab-04/`.
Org-wide dashboard assertions use "at least" comparisons because every backend test file
shares one database and runs in parallel with the others.

---

## 1. Unit Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03 | Follow-up-note rule as a standalone function | Rejects empty note when follow-up is on | none | Not written: the rule lives in the route handler and is covered by API-03 and API-20 |
| UNIT-02 | Unit | BR-08 | Transition matrix lookup | Matches §5.1 for all statuses | none | Not written: exercised through WF-01, WF-03, API-08, AUTH-03 and UI-06 |
| UNIT-03 | Unit | BR-10 | Dashboard query scoping | Requester metrics always scoped to the caller | none | Not written: covered by AUTH-06 and API-13 against the real queries |

## 2. API / Integration Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Create a valid Action Taken | 201, saved under the right ticket, `performedBy` = caller | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | AC-01 | `performedBy` in the body is ignored | Server-set value used | `actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-03 | Follow-up on with empty note; accepted when a note is given | 422 with a `followUpNote` error; 201 with a note | `actions-taken.api.test.ts` | Pass |
| API-04 | API | AC-06 | Edit with a stale `updatedAt` | 409 and the change is not applied | `actions-taken.api.test.ts` | Pass |
| API-05 | API | FR-04 | List ordering | Oldest to newest | `actions-taken.api.test.ts` | Pass |
| API-06 | API | AC-07 | List for a ticket with no actions | 200, empty array | none | Not covered: this test was dropped when the file was rewritten after the PR review. AC-07 is covered at UI level (UI-05) |
| API-07 | API | AC-04 | Staff moves In Progress → Resolved | 200 | `ticket-workflow.api.test.ts` | Pass (inside WF-01) |
| API-08 | API | BR-08 | Transition not in the matrix (New → In Progress) | 422 | `ticket-workflow.api.test.ts` | Pass |
| API-09 | API | AC-06 | Status change with a stale `updatedAt` | 409 | `ticket-workflow.api.test.ts` | Pass |
| API-10 | API | AC-05 | Requester sets "appears resolved" | 200, flag set, status unchanged | `ticket-workflow.api.test.ts` | Pass (same test as WF-04) |
| API-11 | API | AC-02 | Requester dashboard returns the caller's data | 200 with metrics and recent list | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| API-12 | API | FR-10 | Requester with no tickets | 200, zeros, empty list | `requester-dashboard.api.test.ts` | Pass |
| API-13 | API | FR-11 | Staff dashboard org-wide counts | Both staff members see the tickets just created | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| API-14 | API | BR-12 | Over-length description | 422 | `actions-taken.api.test.ts` | Pass |
| API-15 | API | AC-13 | Same action submitted twice quickly | Second call returns the first (200), one row stored | `actions-taken.api.test.ts` | Pass |
| API-16 | API | AC-10 | Create on a Closed ticket; on a Cancelled ticket | 422 each | `actions-taken.api.test.ts` | Pass |
| API-17 | API | BR-09 | Edit without `updatedAt` | 400 | `actions-taken.api.test.ts` | Pass |
| API-18 | API | FR-02 | A different IT Staff member edits the action | 200 | `actions-taken.api.test.ts` | Pass (IT Staff role only; Administrator not separately tested) |
| API-19 | API | BR-12 | Non-string description; over-length follow-up note on edit | 422, not 500 | `actions-taken.api.test.ts` | Pass |
| API-20 | API | BR-04 | Follow-up rule on edit | 422 | `actions-taken.api.test.ts` | Pass |
| API-21 | API | AC-10 | Edit on a Closed ticket | 422 | `actions-taken.api.test.ts` | Pass |
| API-22 | API | FR-12 | Requester metrics grouped into the right buckets | Counts land in myOpen, inProgress, resolved, closed | `requester-dashboard.api.test.ts` | Pass |
| API-23 | API | FR-12 | Recent list size and order | At most 5, newest-updated first | `requester-dashboard.api.test.ts` | Pass |
| API-24 | API | FR-12 | Staff `myAssigned` | Scoped to the caller; excludes Closed/Cancelled | `staff-dashboard.api.test.ts` | Pass |
| API-25 | API | FR-12 | Staff recent list | Includes owned tickets and acted-on tickets; excludes unrelated ones | `staff-dashboard.api.test.ts` | Pass (3 tests) |
| API-26 | API | FR-11 | Staff with nothing relevant | `myAssigned` 0, empty recent list | `staff-dashboard.api.test.ts` | Pass |

## 3. Authorization Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| AUTH-01 | Authorization | AC-08 | Requester tries to create an action | 403 | `actions-taken.api.test.ts` | Pass |
| AUTH-02 | Authorization | AC-08 | Requester reads actions of someone else's ticket | 404 | `actions-taken.api.test.ts` | Pass |
| AUTH-03 | Authorization | AC-11 | Requester asks for a status other than Reopened | 403 | `ticket-workflow.api.test.ts` | Pass |
| AUTH-04 | Authorization | FR-02 | (Original plan: non-author edit blocked.) Replaced when edit rights were widened | See API-18 | `actions-taken.api.test.ts` | Superseded |
| AUTH-05 | Authorization | AC-08 | No session | 401 | `actions-taken.api.test.ts`, `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts` | Pass (no unauthenticated test in `ticket-workflow.api.test.ts`) |
| AUTH-06 | Authorization | AC-02 | One Requester never sees another's tickets on the dashboard | Other Requester's ticket absent | `requester-dashboard.api.test.ts` | Pass (the endpoint takes no id, so there is no parameter to tamper with) |
| AUTH-07 | Authorization | AC-08 | Dashboard role gates | Staff → requester endpoint 403; Requester → staff endpoint 403; Administrator → staff endpoint 200 | `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts` | Pass |
| AUTH-08 | Authorization | FR-05 | Owning Requester reads their ticket's actions | 200, read-only | `actions-taken.api.test.ts` | Pass |

## 4. Workflow Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | BR-08 | New → Open → In Progress → Resolved → Closed | Each hop succeeds | `ticket-workflow.api.test.ts` | Pass |
| WF-02 | Workflow | AC-11 | Requester reopens a Resolved ticket | 200, Reopened | `ticket-workflow.api.test.ts` | Pass (the Reopened → In Progress hop is not asserted) |
| WF-03 | Workflow | BR-08 | Cancel from New, Open, In Progress, Waiting, Reopened; Cancelled is terminal | 200 from each; nothing leaves Cancelled | `ticket-workflow.api.test.ts` | Pass |
| WF-04 | Workflow | AC-05 | "Appears resolved" leaves status alone; staff cannot set it | Status unchanged; staff 403 | `ticket-workflow.api.test.ts` | Pass |
| WF-05 | Workflow | AC-11 | Reopen when the ticket is not Resolved | 422 | `ticket-workflow.api.test.ts` | Pass |

## 5. UI Component Tests

Files in `client/tests/lab-04/`. The handout's suggested names (`ActionsTaken.test.tsx`,
`TicketWorkflow.test.tsx`) are covered by `StaffTicketDetail.test.tsx` and `TicketDetail.test.tsx`.

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | FR-04 | Staff view renders an action's fields | Description, result, note, performer, follow-up badge shown | `StaffTicketDetail.test.tsx` | Pass (order itself is API-05) |
| UI-02 | UI | FR-05 | Requester view | Fields shown; no Add/Edit controls | `TicketDetail.test.tsx` | Pass |
| UI-03 | UI | AC-03 | Follow-up checkbox reveals the note field and sends it | Note field only when checked; payload includes it | `StaffTicketDetail.test.tsx` | Pass |
| UI-04 | UI | AC-13 | Submit disabled while saving | Prevents a second submit | none | Not written (behavior implemented; the server backstop is API-15) |
| UI-05 | UI | AC-07 | Empty state, both roles | "No actions recorded yet." | `StaffTicketDetail.test.tsx`, `TicketDetail.test.tsx` | Pass |
| UI-06 | UI | BR-08 | Status dropdown offers only matrix transitions | From New: Open and Cancelled only | `StaffTicketDetail.test.tsx` | Pass (New case only) |
| UI-07 | UI | BR-08 | Terminal status | Dropdown disabled with helper text | `StaffTicketDetail.test.tsx` | Pass |
| UI-08 | UI | AC-12 | Staff dashboard cards | Values shown; each link has the right URL, including `owner=<own id>` | `StaffDashboard.test.tsx` | Pass |
| UI-09 | UI | AC-12 | Requester dashboard cards and recent list | Right URLs; recent ticket links to its detail page | `RequesterDashboard.test.tsx` | Pass |
| UI-10 | UI | FR-10/11 | Dashboard empty and error states (both dashboards) | Empty text; error alert | `RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx` | Pass (the loading skeleton is not asserted) |
| UI-11 | UI | AC-03 | API validation error | Shown inline; form stays open | `StaffTicketDetail.test.tsx` | Pass |
| UI-12 | UI | FR-02 | Edit | Form pre-filled; `updatedAt` sent | `StaffTicketDetail.test.tsx` | Pass |
| UI-13 | UI | AC-10 | Closed ticket | Add/Edit hidden; notice shown | `StaffTicketDetail.test.tsx` | Pass |
| UI-14 | UI | BR-09 | Status change | Sends the ticket's `updatedAt` | `StaffTicketDetail.test.tsx` | Pass |
| UI-15 | UI | AC-05 | Flag set by the Requester | "Requester indicates resolved" badge shown to staff | `StaffTicketDetail.test.tsx` | Pass |
| UI-16 | UI | AC-05 | "Mark Problem as Resolved" | Calls the API; survives a reload; disabled once set | `TicketDetail.test.tsx` | Pass |
| UI-17 | UI | AC-11 | Reopen button | Only on a Resolved ticket; calls the API | `TicketDetail.test.tsx` | Pass |
| UI-18 | UI | AC-12 | My Tickets reads the URL | `?status=NEW,OPEN,REOPENED` reaches the API unchanged | `MyTickets.test.tsx` | Pass |
| UI-19 | UI | AC-12 | My Queue reads the URL | `?owner=` and `?status=` reach the API; "My Assigned Tickets" heading | `StaffQueue.test.tsx` | Pass |

## 6. UI Style / Responsive / Accessibility

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI Style | ui-spec §6 | Follow-up badge carries meaning in text and icon | "Follow-up needed" text present | `StaffTicketDetail.test.tsx` | Pass (text asserted; the icon is checked by inspection, no axe run) |
| STYLE-02 | UI Style | ui-spec §6 | Action form fields have label/id pairing | Found by label in tests | `StaffTicketDetail.test.tsx` | Pass |
| NAV-01 | E2E | ui-spec §1 | Active-page marking on the Dashboard nav item | Bold class present | `e2e/lab-04/dashboards.spec.ts` | Pass |
| RESP-01 | Responsive | ui-spec §6 | Both dashboards at 1280, 820, and 375px | Screenshots captured | `e2e/lab-04/responsive.spec.ts` | Captured; reviewing for overflow/clipping is an open box in ui-spec §6 |
| RESP-02 | Responsive | ui-spec §6 | Actions Taken list and add form at the same widths | Screenshots captured | `e2e/lab-04/responsive.spec.ts` | Captured; same open box |
| A11Y-01 | Accessibility | ui-spec §6 | Keyboard-only pass | Reachable, visible focus | manual | Not done |

## 7. Migration / Regression

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| REGR-01 | Migration | §7.3 | Migration applied to a database with Lab 1–3 data | No data lost | manual (`prisma migrate dev` on the development database) | Done manually; no automated test |
| REGR-02 | Migration | §7.3 | Rollback / recovery | Schema returns to pre-Lab-4 | none | Not tested (documented only) |
| REGR-03 | Regression | AC-09 | Whole backend suite, Labs 1–4 | All pass | `server/tests/` | Pass (118) |
| REGR-04 | Regression | AC-09 | Whole frontend suite, Labs 1–4 | All pass | `client/tests/` | Pass (67) |
| REGR-05 | Regression | AC-07 | Pre-Lab-4 ticket with no actions | Empty state, no error | UI-05 | Pass |
| REGR-06 | Regression | AC-09 | Lab 2 and Lab 3 E2E suites | All pass after the changes below | `e2e/lab-02/`, `e2e/lab-03/` | Pass |

### Existing tests that had to change

Lab 4 behavior broke these, and each was fixed rather than skipped:

| Test | Why it broke | Change |
|---|---|---|
| Lab 3 `staff-ticket-detail.api.test.ts` (status) | Matrix now rejects New → In Progress | Walks New → Open → In Progress; adds an invalid-transition case |
| `server/tests/helpers/testUser.ts` | Action rows blocked deleting test users/tickets | Cleanup deletes Actions Taken first |
| Lab 3 `StaffTicketDetail.test.tsx` | Page now loads Actions Taken and the ticket type gained a field | Mocks the actions call; sample ticket updated |
| Lab 2 `TicketDetail.test.tsx` | Same two reasons, requester page | Same fix; one assertion reordered to wait for the last state update |
| Lab 2 E2E `responsive`, `requester-ticket-flow` | The Development Requester picker was retired in Lab 3 and these were never migrated | Log in with real accounts; cross-Requester check uses a plain page load |
| Lab 3 E2E `responsive` | Login now lands on `/dashboard`, not the queue or user list | Wait for `/dashboard`, then navigate |

## 8. Performance Smoke

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Perf smoke | — | Dashboard endpoint response time on a larger dataset | Under a set bound | none | Not written |

## 9. End-to-End

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-03 | Staff adds an action; follow-up checked with no note, then fixed | Appears in the list; validation blocks the bad submit | `e2e/lab-04/actions-taken-flow.spec.ts` (2 tests) | Pass |
| E2E-02 | E2E | AC-04, AC-05, AC-11 | Requester creates a ticket and marks it resolved; staff see the badge, resolve through the dropdown; Requester reopens | Status changes only on staff action; Requester has no status dropdown | `e2e/lab-04/ticket-resolution.spec.ts` (2 tests) | Pass |
| E2E-03 | E2E | AC-02, AC-12 | Requester lands on the dashboard and drills into a card | Filtered My Tickets opens | `e2e/lab-04/dashboards.spec.ts` (2 tests) | Pass |
| E2E-04 | E2E | AC-12 | Staff drill into My Assigned | Filtered queue opens | `e2e/lab-04/dashboards.spec.ts` (2 tests) | Pass |
| E2E-05 | E2E | ui-spec §6 | Responsive screenshots, both dashboards and Actions Taken | 9 screenshot tests | `e2e/lab-04/responsive.spec.ts` | Pass |

---

## Coverage check

| AC | Covered by |
|---|---|
| AC-01 | API-01, API-02, E2E-01 |
| AC-02 | API-11, AUTH-06, E2E-03 |
| AC-03 | API-03, API-20, UI-03, UI-11, E2E-01 |
| AC-04 | API-07, AUTH-03, WF-01, UI-06, E2E-02 |
| AC-05 | API-10, WF-04, UI-15, UI-16, E2E-02 |
| AC-06 | API-04, API-09 |
| AC-07 | UI-05, REGR-05 (API-06 not covered) |
| AC-08 | AUTH-01, AUTH-02, AUTH-05, AUTH-07 |
| AC-09 | REGR-03, REGR-04, REGR-06 |
| AC-10 | API-16, API-21, UI-13 |
| AC-11 | WF-02, WF-05, AUTH-03, UI-17, E2E-02 |
| AC-12 | UI-08, UI-09, UI-18, UI-19, E2E-03, E2E-04 |
| AC-13 | API-15 (UI-04 not written) |

## Known gaps

- Not written: standalone unit tests, API-06, UI-04, PERF-01, and an automated migration test.
- Migration rollback is documented but not rehearsed.
- Not asserted: the Reopened → In Progress hop; Administrator-specific action create/edit
  (the same route code serves both roles; only IT Staff is exercised); the dashboard
  loading skeleton; a malformed `updatedAt` on an action edit.
- Manual items still open: keyboard pass, overflow review of screenshots, 320px width.