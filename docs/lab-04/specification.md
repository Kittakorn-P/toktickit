# TokTickIT — Sprint 4 Engineering Specification

**Course:** CPE 334, Sections 1/2/HS/31/32, Semester 1/2026
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression

---

## 1. Sprint Goal

Sprint 4 completes the core service-desk workflow by letting IT Staff and Administrators
record the work performed against a Ticket (Actions Taken), by enforcing a final,
backend-authoritative Ticket status-transition matrix, and by giving Requesters and IT
Staff concise, role-appropriate dashboards that summarize existing ticket data without
duplicating the detailed list/detail screens. The sprint also hardens the full
application built in Labs 1–3 so every earlier feature continues to work under one
consistent Zen Green UI.

## 2. Stakeholder Request (interpreted)

The stakeholder wants two things beyond what exists today: (1) a durable, auditable
record of what IT Staff actually did on a Ticket — separate from the Ticket's own
status — including whether follow-up is needed, and (2) short, at-a-glance dashboards
so Requesters and IT Staff don't have to open the full ticket list to know what needs
attention. Critically, a Requester saying "this looks fixed" is only a signal, not an
approval — only IT Staff can move a Ticket to Resolved, and the backend must enforce
that regardless of what the client sends.

## 3. Scope

**In scope**
- Action Taken CRUD (create + update) scoped to a Ticket, restricted to IT Staff/Admin
- Ticket status-transition matrix enforcement (server-side)
- Requester dashboard and IT Staff dashboard (data + UI)
- Regression coverage and hardening of Labs 1–3 functionality
- Migration that preserves all existing Users/Tickets/Attachments/Comments/Notes

**Explicitly excluded** (per handout §4.2)
- SLA clocks, escalation engines, on-call scheduling, breach notifications
- External notifications (email/SMS/LINE/push)
- Inventory/spare-parts/purchasing/cost accounting
- Time-sheet billing, payroll, labor-cost calculation
- Multi-level approval workflows, e-signatures
- BI tooling, custom report builders, export warehouses
- Multi-tenant orgs, production-scale cloud ops
- Any new feature not in this document

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | IT Staff and Administrators can create an Action Taken on any Ticket they are authorized to access. |
| FR-02 | IT Staff and Administrators can edit an Action Taken they created; Administrators may edit any Action Taken. |
| FR-03 | Every Action Taken records: Action Date/Time (server-set on create), Action Description, Result, Performed By (auto, from session — never client-supplied), Follow-Up Required? (boolean), Follow-up Note (required iff Follow-Up Required = true), Attachment Notes (free text). |
| FR-04 | A Ticket's Actions Taken are shown as an ordered (oldest→newest), append-only list on the Ticket Detail screen. |
| FR-05 | Requesters can view all Actions Taken on their own Tickets (read-only) but cannot create or edit them. |
| FR-06 | The Ticket Owner remains a single field on the Ticket; Actions Taken are independently attributable to whichever IT Staff member performed the work. |
| FR-07 | A Requester can mark a Ticket as "Looks Resolved" (advisory), which does not by itself change Ticket status. |
| FR-08 | Only IT Staff/Admin can transition a Ticket to Resolved, and only via a permitted transition. |
| FR-09 | The system exposes a Requester Dashboard scoped to the authenticated Requester's own Tickets. |
| FR-10 | The system exposes an IT Staff Dashboard (reused by Administrators) scoped to operational, org-wide ticket data. |
| FR-11 | Every dashboard metric has a defined backend calculation and, where practical, a drill-down link to a filtered Ticket Queue/List view. |
| FR-12 | All Lab 1–3 functionality (auth, Requester ticketing, IT Staff queue, Admin user management, comments, notes, attachments) continues to function unchanged after migration. |

## 5. Business Rules

| ID | Rule |
|----|------|
| BR-01 | An Action Taken belongs to exactly one Ticket. |
| BR-02 | The Ticket Owner coordinates the Ticket, but any authorized IT Staff member may record an Action Taken on it — the actor need not be the Owner. |
| BR-03 | `performedBy` on an Action Taken is always set from the authenticated session on the server; a client-supplied value is ignored. |
| BR-04 | `followUpNote` is required and non-empty when `followUpRequired = true`; it is optional/nullable otherwise. Enforced server-side, not just in the form. |
| BR-05 | Action Taken records are append-only for history purposes: `actionDateTime`, `performedBy`, and `ticketId` are immutable after create; `description`, `result`, `followUpRequired`, `followUpNote`, and `attachmentNotes` may be edited by any IT Staff or Administrator (not restricted to the original author — see §11, revised), and edits are timestamped (`updatedAt`). |
| BR-11 | Actions Taken cannot be created or edited once a Ticket is Closed or Cancelled (terminal states). |
| BR-06 | A Ticket may only move to **Resolved** from **In Progress** or **Waiting for Requester**, and only by IT Staff/Admin — never automatically from a Requester's "Looks Resolved" flag. |
| BR-07 | A Requester's "Looks Resolved" indication is stored as an advisory flag on the Ticket and surfaces to IT Staff but never triggers a status change by itself. |
| BR-08 | See §5.1 for the complete transition matrix; any transition not listed is rejected by the API with 409/422 regardless of UI state. |
| BR-09 | A stale/concurrent Ticket update (status change or Action Taken edit) is rejected if the record's `updatedAt`/version the client holds does not match the current one (optimistic concurrency) — see §7. |
| BR-10 | Dashboard metrics are computed from live data at request time (no caching/staleness in this sprint) and are always scoped to what the requesting role/user is authorized to see. |

### 5.1 Ticket Status-Transition Matrix

Statuses: `New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled`

| From ↓ / To → | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| **New** | ✅ IT/Admin | — | — | — | — | — | ✅ IT/Admin |
| **Open** | — | ✅ IT/Admin | — | — | — | — | ✅ IT/Admin |
| **In Progress** | — | — | ✅ IT/Admin | ✅ IT/Admin | — | — | ✅ IT/Admin |
| **Waiting for Requester** | — | ✅ IT/Admin | — | ✅ IT/Admin | — | — | ✅ IT/Admin |
| **Resolved** | — | — | — | — | ✅ IT/Admin (or auto after N days, out of scope) | ✅ Requester or IT/Admin | — |
| **Closed** | — | — | — | — | — | ✅ IT/Admin | — |
| **Reopened** | — | ✅ IT/Admin | ✅ IT/Admin | — | — | — | ✅ IT/Admin |
| **Cancelled** | — | — | — | — | — | — | *(terminal)* |

Notes:
- Requesters may only trigger **Resolved → Reopened**; every other transition is IT Staff/Admin only.
- `Cancelled` and `Closed` are terminal; no outbound transitions.
- All transitions are enforced in the API layer (`ticket.service.ts`), not just hidden/shown in the UI.

## 6. UI Specification Summary

Full control-level detail lives in `ui-spec.md`; this section summarizes structure and
role behavior.

- **IT Staff / Admin Dashboard** — metric cards (New, Open, In Progress, Waiting for
  Requester, My Assigned), "My Recent Tickets" list, Quick Actions. Each card and row is
  a link into the appropriately filtered Ticket Queue or Ticket Detail.
- **Requester Dashboard** — metric cards (My Open, In Progress, Resolved, Closed), "My
  Recent Tickets" list, Quick Actions (Create Ticket, View My Tickets). Scoped strictly
  to the authenticated Requester.
- **Ticket Detail — Actions Taken panel** — table/list of existing actions
  (newest-or-oldest-first per `ui-spec.md`), an "Add Action" form (IT Staff/Admin only,
  hidden — not just disabled — for Requesters), inline edit for the author/Admin.
- **Ticket status control** — a select/menu that only offers the transitions valid for
  the current status and the current user's role (per §5.1); disabled with a tooltip
  when no transitions are available (e.g., terminal states).
- Reuses existing badge, table, card, loading, empty, error, and responsive conventions
  from Labs 2–3; no new visual language introduced.

## 7. Data Changes

### 7.1 New model — `ActionTaken`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID/serial PK | |
| `ticketId` | FK → Ticket, indexed | BR-01 |
| `actionDateTime` | timestamp, server-set on create | immutable |
| `description` | text, required | |
| `result` | text, required | |
| `performedById` | FK → User, server-set from session | BR-03 |
| `followUpRequired` | boolean, default false | |
| `followUpNote` | text, nullable | required iff `followUpRequired` (BR-04, enforced in service layer + DB check constraint) |
| `attachmentNotes` | text, nullable | free text pointer to where files live |
| `createdAt` / `updatedAt` | timestamps | `updatedAt` used for optimistic concurrency (BR-09) |

Indexes: `(ticketId)`, `(performedById)` for dashboard/queue queries.

### 7.2 Ticket model additions

- `looksResolvedByRequester: boolean` (default false) — advisory flag, FR-07/BR-07
- `updatedAt` (if not already present from Lab 2/3) used as the optimistic-concurrency
  token for status-transition and edit requests.

### 7.3 Migration & backfill

- Additive migration only: new `ActionTaken` table, new nullable/defaulted columns on
  `Ticket`. No destructive changes; all Lab 1–3 data is preserved untouched.
- Legacy Tickets with zero Actions Taken behave identically to new Tickets with zero
  Actions Taken — the Actions Taken panel simply renders its empty state, and dashboard
  metrics that don't depend on Actions Taken are unaffected.
- Rollback: the migration is reversible by dropping the new table/columns, since no
  existing column is altered or removed (documented in the migration file's down step).

### 7.4 Seed data

- Idempotent (upsert/find-or-create keyed on stable identifiers) — safe to re-run.
- Covers all 8 statuses, a mix of assigned/unassigned tickets, and tickets with 0, 1, and
  multiple Actions Taken so dashboard metrics are demonstrably non-zero for some
  categories and zero for others.

## 8. API Contract (summary — full detail in `api-spec.md`)

| Endpoint | Method | Access |
|---|---|---|
| `/api/tickets/:ticketId/actions` | GET | Requester (own ticket, read-only), IT Staff/Admin |
| `/api/tickets/:ticketId/actions` | POST | IT Staff/Admin |
| `/api/tickets/:ticketId/actions/:actionId` | PATCH | Author or Admin |
| `/api/tickets/:ticketId/status` | PATCH | Role- and transition-matrix-gated (§5.1) |
| `/api/dashboard/requester` | GET | Requester (self-scoped) |
| `/api/dashboard/staff` | GET | IT Staff/Admin |

- All writes require an `If-Match`-style version/`updatedAt` check; a mismatch returns
  `409 Conflict` with the current record so the client can reload and retry (BR-09).
- Validation errors → `422`; unauthorized → `401`/`403`; not found → `404`; all error
  bodies follow the existing Lab 2/3 safe-error shape (no stack traces, no leaking
  existence of resources the user can't access).

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated creator as `performedBy`. |
| AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. |
| AC-03 | Given `followUpRequired = true` and an empty `followUpNote`, when the Action Taken is submitted, then the API rejects it with a 422 and the UI surfaces the field-level error. |
| AC-04 | Given a Ticket in `In Progress`, when IT Staff transitions it to `Resolved`, then the transition succeeds and the Ticket's status/summary refreshes; when a Requester attempts the same transition, it is rejected with 403. |
| AC-05 | Given a Requester marks "Looks Resolved" on their Ticket, then the Ticket's status is unchanged and the flag is visible to IT Staff on the Ticket Detail screen. |
| AC-06 | Given two clients editing the same Action Taken concurrently, when the second submits with a stale `updatedAt`, then the API returns 409 and no data is silently overwritten. |
| AC-07 | Given a Ticket with zero Actions Taken, when its Detail page is opened, then the Actions Taken panel renders its defined empty state (no error). |
| AC-08 | Given an unauthenticated or wrong-role request to any Action Taken or dashboard endpoint, then the API returns 401/403 and no ticket data is leaked. |
| AC-09 | Given the Lab 1–3 regression suite, when run against the Lab 4 build, then authentication, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, and Admin User Management all pass unchanged. |

## 10. Definition of Done

- [ ] All FR-01–FR-12 implemented and demonstrable
- [ ] All BR-01–BR-10 enforced server-side (verified by tests, not just UI hiding)
- [ ] Full status-transition matrix (§5.1) enforced and tested
- [ ] Migration applied with no data loss; rollback documented and tested
- [ ] Seed data idempotent and covers required scenarios (§7.4)
- [ ] All endpoints in §8 implemented with auth, validation, and conflict handling
- [ ] IT Staff and Requester dashboards implemented with defined, query-backed metrics
- [ ] Unit, API/integration, UI, workflow, regression, and E2E tests passing on `main`
- [ ] Accessibility and responsive checklist (ui-spec.md §12 equivalent) completed
- [ ] `reviewer.md`, `ai-use.md`, README current
- [ ] No console errors, broken links, placeholder text, or unfinished controls

## 11. Assumptions and Decisions

1. **Actions Taken ordering** — displayed oldest-first (chronological work log reading
   order) rather than newest-first; confirmed against `ui-spec.md`.
2. **Edit rights on Actions Taken** — ~~restricted to the original author or an
   Admin~~ **Revised during Issue 2 PR review.** The handout states plainly
   that "IT Staff and Administrators can create and update Actions Taken"
   (§4.3), with no author restriction — the original author-only assumption
   was mine, not the handout's, and has been removed from both the code and
   BR-05. `performedBy` still always reflects who originally recorded the
   action (BR-03); only edit *rights* were widened, not the audit trail.
3. **Optimistic concurrency** — implemented via `updatedAt` comparison rather than a
   separate version integer column, to avoid an extra migration column, consistent with
   how Lab 2/3 already tracks timestamps.
4. **"Looks Resolved"** modeled as a boolean flag on Ticket rather than a separate table,
   since it's a single advisory signal, not a history to preserve.