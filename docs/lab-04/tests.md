# TokTickIT — Sprint 4 Test Plan (DRAFT — not yet implemented/run)

> **Status of this document:** planning only. No Lab 4 tests have been written or
> executed yet — every row below is `Planned`. This file will be updated with real
> `Pass`/`Fail` status and any added/removed tests as implementation proceeds, and the
> final submitted version must show actual passing output from `main`.

Covers unit, API/integration, UI component, UI style/responsive, authorization,
workflow, migration/regression, performance-smoke, and E2E per the Lab 4 handout.
Every Acceptance Criterion in `specification.md` §9 must map to at least one test below.

---

## 1. Unit Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03 | Follow-up note required when `followUpRequired=true` (validator fn) | Rejects empty note; accepts non-empty | `server/tests/lab-04/actions-taken.unit.test.ts` | Planned |
| UNIT-02 | Unit | BR-08 | Status-transition matrix lookup fn returns allowed set per (status, role) | Matches §5.1 exactly for all 8 statuses | `server/tests/lab-04/ticket-transitions.unit.test.ts` | Planned |
| UNIT-03 | Unit | BR-10 | Dashboard metric query builders produce role-scoped filters | Requester builder always includes `requesterId=self`; staff builder never does | `server/tests/lab-04/dashboard-queries.unit.test.ts` | Planned |

## 2. API / Integration Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Create a valid Actions Taken | Created under correct Ticket, `performedBy` = authenticated actor | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | AC-01 | `performedBy`/`actionDateTime` in request body are ignored | Server-set values used regardless of payload | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-03 | Create Actions Taken with `followUpRequired=true`, empty note | 422 with `VALIDATION_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | AC-06 | Edit Actions Taken with stale `updatedAt` | 409 with current record attached, no data overwritten | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API | — | GET Actions Taken list ordering | Returned oldest → newest | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API | AC-07 | GET Actions Taken for a ticket with zero actions | 200 with empty array, not an error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API | AC-04 | PATCH ticket status `In Progress → Resolved` as IT Staff | 200, status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-08 | API | BR-08 | PATCH ticket status with a transition not in the matrix | 422 `INVALID_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-09 | API | AC-06 | PATCH ticket status with stale `updatedAt` | 409 with current record | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-10 | API | AC-05 | PATCH `looks-resolved` as owning Requester | 200, flag set; Ticket status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-11 | API | AC-02 | GET `/api/dashboard/requester` | Metrics/recent tickets scoped to caller only | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-12 | API | — | GET `/api/dashboard/requester` with zero tickets | 200, all metrics 0, empty recent list | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-13 | API | — | GET `/api/dashboard/staff` | Metrics match seeded counts by status; `myAssigned` scoped to caller | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |

## 3. Authorization Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| AUTH-01 | Authorization | AC-08 | Requester attempts POST Actions Taken | 403, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTH-02 | Authorization | AC-08 | Requester requests Actions Taken for a ticket they don't own | 404 (not 403, per api-spec.md §1) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTH-03 | Authorization | AC-04 | Requester attempts PATCH ticket status to anything other than Reopened | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| AUTH-04 | Authorization | — | IT Staff (non-author, non-Admin) attempts to edit another staff member's Action Taken | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTH-05 | Authorization | AC-08 | Unauthenticated request to any Lab 4 endpoint | 401 | `server/tests/lab-04/actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts` | Planned |
| AUTH-06 | Authorization | AC-02 | Requester A requests `/api/dashboard/requester` and receives only own data (crafted attempts to pass another `requesterId` are ignored) | 200, data strictly scoped to caller | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |

## 4. Workflow Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | BR-08 | Full lifecycle walk: New → Open → In Progress → Resolved → Closed | Each step succeeds only via a valid transition | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-02 | Workflow | BR-08 | Reopen path: Resolved → Reopened → In Progress | Succeeds; Requester can trigger only the first hop | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-03 | Workflow | BR-08 | Cancellation from New/Open/In Progress/Waiting/Reopened | Succeeds from each; Cancelled has no outbound transitions | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-04 | Workflow | AC-05 | "Looks Resolved" set, then IT Staff resolves via normal transition | Flag visible to IT Staff; resolution still requires explicit IT Staff action | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |

## 5. UI Component Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI Component | FR-04 | Actions Taken list renders rows in oldest→newest order | Matches API order | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI Component | FR-05 | Actions Taken panel for Requester role | No Add/Edit controls rendered | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI Component | AC-03 | Add Action form: toggling Follow-Up Required shows/requires the note field | Note field appears and is required only when toggled on | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-04 | UI Component | — | Submit button disabled while request in flight | Prevents duplicate submission on repeated click | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-05 | UI Component | — | Actions Taken empty state | Renders "No actions recorded yet" + CTA for IT Staff/Admin only | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-06 | UI Component | BR-08 | Status control only lists transitions valid for current status+role | Matches matrix in specification.md §5.1 | `client/.../lab-04 tests/TicketWorkflow.test.tsx` | Planned |
| UI-07 | UI Component | — | Status control disabled state with helper text on terminal statuses | Disabled + tooltip/helper text shown | `client/.../lab-04 tests/TicketWorkflow.test.tsx` | Planned |
| UI-08 | UI Component | — | Staff Dashboard metric cards render label+value and link to filtered queue | Correct filter query params on click | `client/.../lab-04 tests/StaffDashboard.test.tsx` | Planned |
| UI-09 | UI Component | — | Requester Dashboard scoped rendering | Only own tickets shown in Recent Tickets | `client/.../lab-04 tests/RequesterDashboard.test.tsx` | Planned |
| UI-10 | UI Component | — | Dashboard loading/empty/safe-failure states | Skeletons while loading; empty-state copy when no data; isolated per-card failure on fetch error | `client/.../lab-04 tests/StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx` | Planned |

## 6. UI Style / Responsive / Accessibility Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI Style | — | Follow-Up badge conveys status via icon+text | Not color-only (axe/manual check) | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| STYLE-02 | UI Style | — | Actions Taken form fields have `label`/`for`–`id` pairing | No regression of Lab 3 accessibility fix | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| RESP-01 | Responsive | — | Both dashboards at 320px/768px/1024px+ | No horizontal scroll, no clipped/overlapping content | manual + screenshots, `artifacts/lab-04/screenshots/` | Planned |
| RESP-02 | Responsive | — | Actions Taken panel at mobile width | Form and table remain usable, no overflow | manual + screenshots | Planned |
| A11Y-01 | Accessibility | — | Keyboard-only pass through both dashboards and Actions Taken panel | All interactive elements reachable, visible focus ring | manual | Planned |

## 7. Migration / Regression Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| REGR-01 | Migration | — | Run Lab 4 migration against a DB seeded through Lab 3 | All existing Users/Tickets/Attachments/Comments/Notes intact, no data loss | `server/tests/lab-04/migration.test.ts` | Planned |
| REGR-02 | Migration | — | Migration rollback (down) | Schema returns to pre-Lab-4 state without touching untouched columns | `server/tests/lab-04/migration.test.ts` | Planned |
| REGR-03 | Regression | AC-09 | Full Lab 1–3 backend suite re-run against Lab 4 build | All previously-passing tests still pass | existing `server/tests/lab-0{1,2,3}` suites | Planned |
| REGR-04 | Regression | AC-09 | Full Lab 1–3 frontend suite re-run against Lab 4 build | All previously-passing tests still pass | existing `client/.../lab-0{1,2,3}` suites | Planned |
| REGR-05 | Regression | AC-07 | Legacy (pre-Lab-4) ticket with no Actions Taken | Renders correctly with empty-state panel, dashboards unaffected | `server/tests/lab-04/migration.test.ts` | Planned |

## 8. Performance Smoke Test

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance Smoke | — | Dashboard endpoints under seeded dataset (hundreds of tickets) | Response time within acceptable bound (e.g., < 500ms local); no N+1 query blowup | `server/tests/lab-04/dashboard-performance.test.ts` | Planned |

## 9. End-to-End Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-03 | IT Staff logs in, opens a Ticket, adds an Action Taken (with and without follow-up) | Action appears in list; validation blocks bad submission | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-04, AC-05 | Requester marks "Looks Resolved" → IT Staff reviews and formally resolves the Ticket | Status only changes on IT Staff action; flag visible throughout | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-02 | Requester views their dashboard, drills into a metric | Filtered list shows only their own matching tickets | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-04 | E2E | — | IT Staff views staff dashboard, drills into "My Assigned" | Filtered queue matches ownership | `e2e/lab-04/dashboards.spec.ts` | Planned |

---

## Coverage Check

| AC | Covered by |
|---|---|
| AC-01 | API-01, API-02, E2E-01 |
| AC-02 | API-11, AUTH-06, E2E-03 |
| AC-03 | UNIT-01, API-03, UI-03, E2E-01 |
| AC-04 | API-07, AUTH-03, UI-06, E2E-02 |
| AC-05 | API-10, WF-04, E2E-02 |
| AC-06 | API-04, API-09 |
| AC-07 | API-06, UI-05, REGR-05 |
| AC-08 | AUTH-01, AUTH-02, AUTH-05 |
| AC-09 | REGR-03, REGR-04 |

Every Acceptance Criterion has at least one mapped test. Remaining work before this
file is "final": implement each test, replace `Planned` with `Pass`/`Fail`, and attach
actual CI/test-run output for the submission (Part 3 requires passing output from
`main`).