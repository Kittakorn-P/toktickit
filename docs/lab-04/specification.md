# TokTickIT — Sprint 4 Engineering Specification

**Course:** CPE 334, Sections 1/2/HS/31/32, Semester 1/2026
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression

> **Revision note:** first written before implementation, then revised after the build so
> it describes what shipped. The original draft is in git history. Changes made during
> implementation (most notably edit rights on Actions Taken, §11 item 2) are marked.

---

## 1. Sprint Goal

Sprint 4 completes the core service-desk workflow. IT Staff and Administrators record the
work done on a Ticket (Actions Taken), the backend enforces a final status-transition
matrix, and Requesters and IT Staff get concise role-based dashboards that link into the
existing list and detail screens. The sprint also hardens Labs 1–3 so every earlier
feature keeps working under one consistent Zen Green UI.

## 2. Stakeholder Request (interpreted)

The stakeholder wants (1) a durable record of what IT Staff actually did on a Ticket,
separate from its status, including whether follow-up is needed, and (2) at-a-glance
dashboards so people don't have to open the full list to see what needs attention.
A Requester saying "this looks fixed" is only a signal: only IT Staff can move a Ticket
to Resolved, and the backend enforces that whatever the client sends.

## 3. Scope

**In scope**
- Actions Taken: create and edit by IT Staff/Administrator, read-only for Requesters
- Status-transition matrix enforced by the backend
- Requester "appears resolved" flag and Requester Reopen of a Resolved ticket
- Requester dashboard and IT Staff/Administrator dashboard, with drill-down into the
  existing ticket lists; Dashboard becomes the landing page for every role
- Regression coverage and hardening of Labs 1–4
- An additive migration that keeps all existing data

**Explicitly excluded** (handout §4.2)
- SLA clocks, escalation, on-call scheduling, breach notifications
- External notifications (email, SMS, LINE, push)
- Inventory, spare parts, purchasing, cost accounting
- Time-sheet billing, payroll, labor cost
- Multi-level approvals, e-signatures
- BI tooling, report builders, export warehouses
- Multi-tenant organizations, production cloud operations
- Any feature not listed in this document

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | IT Staff and Administrators can create an Action Taken on any Ticket (subject to BR-11). |
| FR-02 | IT Staff and Administrators can edit any Action Taken, not only their own (revised, §11.2). |
| FR-03 | Every Action Taken records: Action Date/Time (server-set), Action Description, Result, Performed By (server-set from the session), Follow-Up Required?, Follow-up Note (required when follow-up is needed), Attachment Notes. |
| FR-04 | A Ticket's Actions Taken are listed oldest to newest on the Ticket Detail screen. |
| FR-05 | Requesters see all Actions Taken on their own Tickets, read-only. |
| FR-06 | The Ticket Owner stays a single field on the Ticket; Actions Taken are attributed to whoever performed them. |
| FR-07 | A Requester can mark their Ticket as appearing resolved (advisory only). |
| FR-08 | Only IT Staff/Administrator can move a Ticket to Resolved, and only through a permitted transition. |
| FR-09 | A Requester can Reopen their own Ticket, only while it is Resolved. |
| FR-10 | A Requester dashboard summarizes only the logged-in Requester's Tickets. |
| FR-11 | An IT Staff dashboard (reused by Administrators) summarizes operational ticket data. |
| FR-12 | Every dashboard card has a backend-defined calculation (§5.2) and links to a filtered list. |
| FR-13 | My Tickets and My Queue read their filters from the URL so dashboard links filter on arrival; the `status` filter accepts a comma-separated list. |
| FR-14 | Dashboard is the landing page after login for all roles. |
| FR-15 | All Lab 1–3 functionality (login, Requester ticketing, IT Staff queue, Administrator user management, comments, notes, attachments) keeps working. |

## 5. Business Rules

| ID | Rule |
|----|------|
| BR-01 | An Action Taken belongs to exactly one Ticket. |
| BR-02 | The Ticket Owner coordinates the Ticket, but any IT Staff member or Administrator may record an Action Taken on it. |
| BR-03 | `performedBy` and `actionDateTime` are set by the server from the session and clock. Client-supplied values are ignored. |
| BR-04 | `followUpNote` is required and non-empty when `followUpRequired` is true (enforced by the API, not only the form). When `followUpRequired` is false the note is stored as empty. |
| BR-05 | `actionDateTime`, `performedBy`, and `ticketId` never change after creation. `description`, `result`, `followUpRequired`, `followUpNote`, and `attachmentNotes` can be edited by any IT Staff member or Administrator; each edit updates `updatedAt`. |
| BR-06 | A Ticket can move to Resolved only from In Progress or Waiting for Requester, and only by IT Staff/Administrator. |
| BR-07 | "Appears resolved" is an advisory flag the owning Requester can set in any status. It never changes the Ticket status. |
| BR-08 | Status changes follow the matrix in §5.1. The staff endpoint rejects any other transition with 422. The Requester endpoint accepts only Reopened (anything else: 403), and only from Resolved (otherwise: 422). |
| BR-09 | Action edits **require** `updatedAt`, and a stale value is rejected with 409 by a single atomic update. Status changes return 409 when the client sends a stale `updatedAt` (the UI always does); a client that omits it skips the check, and the check is not atomic. See §11.3. |
| BR-10 | Dashboard numbers are calculated live by the backend and scoped as described in §5.2. |
| BR-11 | No Action Taken can be created or edited once a Ticket is Closed or Cancelled. |
| BR-12 | Text fields must be strings within these limits: description 4000, result 4000, follow-up note 2000, attachment notes 1000 characters. Violations return 422. |
| BR-13 | A create request identical to one from the same person on the same Ticket (same description and result) within the previous 5 seconds returns the existing action instead of creating a second one (double-click/retry backstop). |

### 5.1 Ticket Status-Transition Matrix

Statuses: `New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled`.
"Staff" means IT Staff or Administrator.

| From ↓ / To → | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| **New** | Staff | — | — | — | — | — | Staff |
| **Open** | — | Staff | — | — | — | — | Staff |
| **In Progress** | — | — | Staff | Staff | — | — | Staff |
| **Waiting for Requester** | — | Staff | — | Staff | — | — | Staff |
| **Resolved** | — | — | — | — | Staff | Requester or Staff | — |
| **Closed** | — | — | — | — | — | Staff | — |
| **Reopened** | — | Staff | Staff | — | — | — | Staff |
| **Cancelled** | — | — | — | — | — | — | *(terminal)* |

- A Requester can only trigger Resolved → Reopened.
- Cancelled has no outgoing transitions. Closed can only be reopened by staff.
- The matrix lives in `server/src/utils/ticketTransitions.ts` and is checked by the route
  handlers; `client/src/utils/ticketTransitions.ts` is a copy used only to choose which
  options the dropdown shows.

### 5.2 Dashboard Calculation Rules

All counts come from the backend (`/api/dashboard/*`). There are no calendar-day or
time-zone boundaries: the only time-based rule is ordering by `updatedAt` (stored in UTC).
An empty result returns zeros and an empty list, never an error.

**Requester dashboard** (always `requesterId = the logged-in user`):

| Metric | Calculation |
|---|---|
| myOpen | status is New, Open, or Reopened |
| inProgress | status is In Progress or Waiting for Requester |
| resolved | status is Resolved |
| closed | status is Closed |
| recent list | the 5 most recently updated tickets, any status |

Cancelled tickets are in no card; they still appear in My Tickets and the recent list.

**IT Staff / Administrator dashboard:**

| Metric | Calculation |
|---|---|
| new, open, inProgress, waitingForRequester | organization-wide count of tickets in that one status |
| myAssigned | owned by the caller and status not Closed or Cancelled |
| recent list | the 5 most recently updated tickets the caller owns or has recorded an Action Taken on |

Resolved, Closed, Reopened, and Cancelled tickets have no organization-wide card (a
Reopened or Resolved ticket you own is counted in myAssigned).

## 6. UI Specification Summary

Control-level detail, states, responsive rules, and the accessibility checklist are in
`ui-spec.md`. In short:

- **Dashboards:** metric cards (each a link into a filtered list), a recent-tickets panel,
  and Quick Actions, with loading, empty, and failure states.
- **Ticket Detail, IT Staff:** an Actions Taken card with an inline add/edit form, a status
  dropdown limited to permitted transitions, and a "Requester indicates resolved" badge.
- **Ticket Detail, Requester:** a read-only Actions Taken card, a "Mark Problem as
  Resolved" button, and a Reopen button while the ticket is Resolved.
- **Navigation:** a Dashboard link for every role, with bold/underline active-page marking.

## 7. Data Changes

### 7.1 New model: `ActionTaken`

| Field | Type | Notes |
|---|---|---|
| `id` | Int, auto-increment, primary key | |
| `ticketId` | Int, foreign key → Ticket, indexed | BR-01 |
| `actionDateTime` | DateTime, default now | set by the server, never edited |
| `description` | String, required | ≤ 4000 (BR-12) |
| `result` | String, required | ≤ 4000 |
| `performedById` | Int, foreign key → User, indexed | set from the session (BR-03) |
| `followUpRequired` | Boolean, default false | |
| `followUpNote` | String, optional | required when `followUpRequired` (BR-04); ≤ 2000 |
| `attachmentNotes` | String, optional | ≤ 1000 |
| `createdAt`, `updatedAt` | DateTime | `updatedAt` is the concurrency token (BR-09) |

Length limits and the follow-up rule are enforced in the route handler. A database CHECK
constraint was considered and skipped to keep the migration simple.

**Database design decisions (handout §5.1 asks for at least two):**
1. *Separate child table, not columns on Ticket.* A ticket has many actions, each with its
   own author and timestamps; a child table keeps that history queryable and lets the
   dashboard's "acted on by me" filter use the `performedById` index.
2. *`updatedAt` as the concurrency token instead of a version column.* Prisma already
   maintains it on every write, so no extra column or migration step is needed, and it can
   be compared directly inside the `WHERE` clause of an atomic update.

### 7.2 Ticket model change

- Added `looksResolvedByRequester` (Boolean, default false): the advisory flag (BR-07).
- `updatedAt` already existed from earlier labs and is reused as the token for status changes.

### 7.3 Migration, backfill, and recovery

- Migration `20260924030752_lab4_actions_taken`. The schema change only adds one table and
  one defaulted column, so no existing row or column is altered, and Users, Tickets,
  Attachments, Comments, and Notes remain valid.
- **Backfill:** none needed. A ticket created before Lab 4 simply has zero Actions Taken
  (its panel shows the empty state) and `looksResolvedByRequester = false`. Dashboard
  counts depend only on ticket status and ownership, so they treat old tickets the same
  as new ones.
- **Rollback / recovery:** Prisma does not generate "down" migrations. To undo: drop the
  `ActionTaken` table and the `looksResolvedByRequester` column, then delete that
  migration's row from `_prisma_migrations`; in development `npx prisma migrate reset`
  rebuilds everything. Because the change is additive, applying it never destroys data.
  This recovery path is documented but has **not** been rehearsed or covered by an
  automated test (see `tests.md`, REGR-02).
- **Evidence the migration kept data:** it was applied with `prisma migrate dev` to the
  development database that already held Lab 1–3 data, and the full Lab 1–3 suites pass
  against it.

### 7.4 Seed data

- `prisma db seed` can be re-run. It upserts Categories, Related Systems, and the user
  accounts, **resets the Requester and IT Staff passwords** to the initial dev password
  with a forced change (the Administrator is left alone), and **deletes and re-creates all
  Actions Taken**.
- It **does not create Tickets.** Actions Taken are seeded onto whatever tickets already
  exist: the first gets none, the second one, the third two (by different staff) plus the
  "appears resolved" flag, and the rest one each.
- **Gap against handout §5.3:** the handout asks for realistic tickets covering all
  statuses, priorities, and assigned/unassigned states. That is not met; tickets are
  created through the app and the test suites. See §11.9.

## 8. API Contract (summary; full detail in `api-spec.md`)

| Endpoint | Method | Access |
|---|---|---|
| `/api/tickets/:id/actions` | GET | Requester, own ticket only (404 otherwise) |
| `/api/staff/tickets/:id/actions` | GET | IT Staff, Administrator |
| `/api/staff/tickets/:id/actions` | POST | IT Staff, Administrator |
| `/api/staff/tickets/:id/actions/:actionId` | PATCH | IT Staff, Administrator (any action) |
| `/api/staff/tickets/:id/status` | PATCH | IT Staff, Administrator; matrix-checked |
| `/api/tickets/:id/status` | PATCH | Requester, own ticket; Reopened from Resolved only |
| `/api/tickets/:id/looks-resolved` | PATCH | Requester, own ticket |
| `/api/dashboard/requester` | GET | Requester |
| `/api/dashboard/staff` | GET | IT Staff, Administrator |

- Authentication failures use the existing envelope `{ error: { code, message } }`; errors
  from the routes themselves are `{ error: "message" }`, and field validation errors are
  `{ errors: { field: "message" } }`.
- Stale updates return 409 with the current record (BR-09); validation failures 422; wrong
  role 403; missing or not-owned 404.

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as `performedBy`, even if the request names someone else. |
| AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. |
| AC-03 | Given `followUpRequired = true` and an empty `followUpNote`, when the action is submitted, then the API returns 422 and the UI shows the field-level error without closing the form. |
| AC-04 | Given a Ticket in In Progress, when IT Staff moves it to Resolved, then it succeeds and the screen shows the new status; when a Requester attempts the same, the API returns 403. |
| AC-05 | Given a Requester marks a Ticket as appearing resolved, then its status is unchanged and IT Staff see a "Requester indicates resolved" badge. |
| AC-06 | Given two clients editing the same Action Taken, when the second submits a stale `updatedAt`, then the API returns 409 and nothing is overwritten. |
| AC-07 | Given a Ticket with no Actions Taken, when its detail page opens, then the Actions Taken card shows its empty state with no error. |
| AC-08 | Given an unauthenticated or wrong-role request to an Action Taken or dashboard endpoint, then the API returns 401/403 and no ticket data is returned. |
| AC-09 | Given the Lab 1–3 suites, when run against the Lab 4 build, then login, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, and Administrator user management all pass. |
| AC-10 | Given a Closed or Cancelled Ticket, when anyone tries to create or edit an Action Taken, then the API returns 422 and the UI hides Add/Edit. |
| AC-11 | Given a Requester, when they ask for any status change other than Reopened, the API returns 403; Reopen succeeds only on their own Resolved ticket. |
| AC-12 | Given a dashboard card is clicked, then My Tickets or My Queue opens already filtered to that card's statuses or owner. |
| AC-13 | Given the same action is submitted twice within 5 seconds, then only one Action Taken is stored. |

Each criterion maps to tests in `tests.md`.

## 10. Definition of Done

- [x] FR-01–FR-15 implemented and demonstrable
- [x] Rules BR-01–BR-13 enforced by the backend and covered by tests, except the gaps
      listed in §11 (status-change concurrency is optional and non-atomic)
- [x] Full status-transition matrix (§5.1) enforced and tested
- [x] Migration applied to a database holding Lab 1–3 data with no data loss
- [ ] Migration rollback rehearsed and tested (documented only; §7.3)
- [ ] Seed creates realistic tickets across all statuses with 0/1/many actions (§7.4, gap)
- [x] All endpoints in §8 implemented with authorization, validation, and conflict handling
- [x] Requester and IT Staff dashboards implemented with backend-calculated metrics
- [x] Backend, frontend, and E2E suites passing (counts in `tests.md`)
- [ ] Keyboard-only accessibility pass and 320px check (open items in `ui-spec.md` §6)
- [ ] No leftover obsolete Lab 2 elements (Development Requester scaffolding; `ui-spec.md` §6)
- [x] `reviewer.md`, `ai-use.md`, and README current once the PR links and comments are added

## 11. Assumptions and Decisions

1. **Ordering:** Actions Taken are shown oldest first (a chronological work log).
2. **Edit rights (revised during the Issue 2 review):** the draft limited edits to the
   original author or an Administrator. The handout (§4.3) says IT Staff and Administrators
   "create and update" Actions Taken with no author restriction, so any of them can edit.
   `performedBy` still records who first logged the action.
3. **Concurrency:** `updatedAt` is the token. It is mandatory and checked atomically on
   action edits. On status changes the UI always sends it and a stale value returns 409,
   but the API accepts a request without it and checks it read-then-write. Closing that
   gap (make it mandatory and atomic) is a known follow-up.
4. **"Appears resolved"** is a Boolean on the Ticket, not a history table. The UI can set
   it but not clear it (the API accepts `false`).
5. **Dashboard landing for every role,** including Administrators (previously sent to
   User Management, which is still one click away in the nav).
6. **Whole-page dashboard loading and failure,** not per card: every other screen uses one
   load state, and per-card isolation would need several endpoints.
7. **Multi-status filters:** `?status=NEW,OPEN,REOPENED` so a card that groups statuses can
   drill down accurately; unknown values are ignored.
8. **Actions Taken has no assignee or status of its own.** The handout's Part 6 list
   (assign, complete, cancel, inactive-assignee rejection) is read at ticket level:
   *assign* is the existing Claim Ticket owner flow, *complete* is moving the ticket to
   Resolved, *cancel* is moving it to Cancelled, and rejecting an inactive assignee is the
   Lab 3 claim endpoint's check. An action is a log entry, not a work item.
9. **Seed does not create tickets** (§7.4). Gap against handout §5.3.
10. **No "needs at least one Action Taken before Resolved" rule.** A reviewer raised it on
    the Issue 2 pull request and it was deferred. It is **not implemented in Sprint 4**: the
    resolution gate is role and matrix based (BR-06, BR-07, BR-08).
11. **Reopened tickets** have no organization-wide dashboard card; staff reach them through
    the queue's status filter (or My Assigned if they own them).
12. **Timestamps** are stored and returned in UTC and shown in the browser's local time.