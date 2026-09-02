# Lab 2 Test Plan and Results (tests.md)

## 1. Test Strategy

Tests are planned from `specification.md`'s Acceptance Criteria (AC-01–AC-12) before
implementation, following TDD: write the failing test first, implement the minimum
behavior to pass it, refactor. Coverage spans unit (business logic like Ticket Number
generation), API/integration (endpoint contracts, ownership, validation), UI component
(form/list behavior, states), responsive (viewport layout), and E2E (full user flows).
Every AC must map to at least one automated test with a real file path.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces unique, correctly formatted numbers | Format matches spec; no collisions across repeated calls | `server/tests/lab-02/ticketNumber.unit.test.ts` | Pending |
| API-01 | API | AC-01, FR-02, FR-03 | POST /api/tickets with valid data | 201; Ticket saved; unique ticketNumber returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-04, BR-09 | POST /api/tickets with missing Summary | 400; field-level error; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | AC-03, BR-07, BR-19 | GET /api/tickets/:id for a Ticket owned by another Requester | 404; no Ticket data in response body | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-04 | API | AC-03, BR-19 | GET /api/tickets/:id for a Ticket ID that does not exist at all | 404; response identical in shape to API-03 | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-05 | API | FR-04, BR-08 | GET /api/tickets returns only the requesting Requester's own Tickets | Response contains 0 Tickets belonging to other Requesters | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-06 | API | FR-05, FR-06, FR-07, BR-10 | GET /api/tickets with search, filter, sort, and pagination params | Correct filtered/sorted/paginated subset returned; invalid params fall back to defaults | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-07 | API | AC-09, BR-17 | GET /api/tickets with a filter combination matching zero Tickets | 200; empty `tickets` array; distinct from Requester-has-none case | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-08 | API | AC-07, BR-13 | POST /api/tickets/:id/attachments with oversized or wrong-type file | 400; Attachment not saved | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-09 | API | BR-13 | POST /api/tickets/:id/attachments when Ticket already has 5 active Attachments | 409; 6th Attachment rejected | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-10 | API | AC-10, BR-15 | PATCH /api/attachments/:id/remove on an owned, active Attachment | 200; isRemoved true; metadata retained | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-11 | API | BR-15 | GET /api/attachments/:id/download on a removed Attachment | 404; file not returned | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-12 | API | BR-07 | PATCH /api/attachments/:id/remove on an Attachment owned by another Requester | 404; Attachment not modified | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-13 | API | AC-05, BR-11 | Two rapid POST /api/tickets calls simulating a double-click | Only one Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-14 | API | FR-01 | GET /api/requesters | Response excludes inactive Requesters (BR-16) | `server/tests/lab-02/requesters.api.test.ts` | Pending |
| UI-01 | UI | AC-04 | Create Ticket form submitted with empty Summary | Inline field message shown; API not called | `client/src/.../lab-02 tests/CreateTicket.test.tsx` | Pending |
| UI-02 | UI | AC-05, BR-11 | Submit button clicked twice quickly | Button disabled after first click; second click has no effect | `client/src/.../lab-02 tests/CreateTicket.test.tsx` | Pending |
| UI-03 | UI | AC-06, BR-12 | Ticket submission fails (simulated network error) | Error state shown; all field values still populated | `client/src/.../lab-02 tests/CreateTicket.test.tsx` | Pending |
| UI-04 | UI | AC-07 | User selects an invalid file (wrong type/too large) | Inline error shown; file not added to pending list | `client/src/.../lab-02 tests/CreateTicket.test.tsx` | Pending |
| UI-05 | UI | AC-08 | My Tickets loaded for a Requester with zero Tickets | Empty state message shown (not no-results) | `client/src/.../lab-02 tests/MyTickets.test.tsx` | Pending |
| UI-06 | UI | AC-09 | My Tickets search/filter matches nothing | No-results state shown (distinct copy from empty state) | `client/src/.../lab-02 tests/MyTickets.test.tsx` | Pending |
| UI-07 | UI | AC-11 | Requester switched from A to B in the app shell | My Tickets list reloads; Requester A's tickets no longer shown | `client/src/.../lab-02 tests/MyTickets.test.tsx` | Pending |
| UI-08 | UI | BR-19 | Ticket Detail opened for owned Ticket vs. not-owned/nonexistent Ticket | Owned Ticket renders normally; other case shows generic not-found UI | `client/src/.../lab-02 tests/RequesterTicketDetail.test.tsx` | Pending |
| UI-09 | UI | AC-10 | Attachment removed via confirm dialog | Confirmation shown before call; item marked Removed after; download control disabled | `client/src/.../lab-02 tests/AttachmentSection.test.tsx` | Pending |
| RESP-01 | Responsive | AC-12 | Create Ticket rendered at desktop, tablet, mobile viewports | No clipping/overlap; no horizontal scroll at any width | Playwright screenshots — `e2e/lab-02/responsive.spec.ts` | Pending |
| RESP-02 | Responsive | AC-12 | My Tickets table/card view rendered at all three viewport sizes | Table becomes card layout on mobile; all controls remain reachable | Playwright screenshots — `e2e/lab-02/responsive.spec.ts` | Pending |
| E2E-01 | E2E | AC-01, AC-11 | Full flow: select Requester → create Ticket → find it in My Tickets | Ticket appears with correct Ticket Number after creation | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03 | Requester B attempts to directly navigate to Requester A's Ticket Detail URL | Not-found / access-denied UI shown; no Ticket data rendered | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-10 | Upload an attachment, then soft-remove it, then attempt download | Removed Attachment cannot be downloaded via UI | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-10 | UI | AC-02 | RequireRequester guard with no Requester selected | Redirects to Requester Selection screen; protected content never renders | `client/tests/lab-02/RequireRequester.test.tsx` | Pass |
| API-15 | API | BR-06 | Requester deactivated mid-session, same session reused | Next request from that Requester returns 401 | `server/tests/lab-02/requester-deactivation.api.test.ts` | Pass |
| API-16 | API | BR-14 | Attachment upload fails after Ticket already created | Ticket remains saved and retrievable; failure scoped to the attachment only | `server/tests/lab-02/attachments.api.test.ts` | Pass |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | *(add: redirect-to-selector test — see Known Limitations)* |
| AC-03 | API-03, API-04, E2E-02 |
| AC-04 | API-02, UI-01 |
| AC-05 | API-13, UI-02 |
| AC-06 | UI-03 |
| AC-07 | API-08, UI-04 |
| AC-08 | UI-05 |
| AC-09 | API-07, UI-06 |
| AC-10 | API-10, API-11, UI-09, E2E-03 |
| AC-11 | API-05, UI-07 |
| AC-12 | RESP-01, RESP-02 |
| AC-02 | UI-10 |

## 4. Responsive and Visual Checklist

- [ ] Desktop (≥992px): multi-column layout, content centered with max-width
- [ ] Tablet (768–991px): two-column layout, Summary/Description have adequate width
- [ ] Mobile (<768px): fields stack vertically, no horizontal scroll, touch-friendly buttons
- [ ] No clipped labels or overlapping validation messages at any size
- [ ] Priority/Status badges remain readable and consistent across viewports
- [ ] My Tickets: desktop table vs. mobile card/responsive-table both usable
- [ ] Filters, pagination, and attachment controls remain reachable at all sizes
- [ ] Screenshots captured per screen (Create Ticket, My Tickets, Ticket Detail) at all 3
      breakpoints, stored under `artifacts/lab-02/screenshots/`

## 5. Test Commands

```bash
# Backend unit + API tests
cd server && npm run test

# Frontend component tests
cd client && npm run test

# E2E + responsive screenshots (Playwright)
npx playwright test e2e/lab-02
```

*(Confirm these match your actual package.json scripts before finalizing — adjust if your
test runner commands differ.)*

## Section 6. Final Results — paste this into docs/lab-02/tests.md

Ran on final `lab2-staging` branch, [FILL IN today's date].

**Backend (server/) — `npm run test`**
```
Test Files  9 passed (9)
     Tests  28 passed (28)
```
Covers: Lab 1 regression (categories, health), Ticket creation/validation,
ownership enforcement, My Tickets search/filter/sort/pagination, full
Attachment lifecycle, Requester deactivation mid-session (BR-06), related
systems, requesters, ticket number generation.

**Frontend (client/) — `npm run test`**
```
Test Files  6 passed (6)
     Tests  17 passed (17)
```
Covers: Lab 1 regression (health check UI), Create Ticket (validation/
success/failure states), My Tickets (empty/no-results/populated states),
Requester Selection (loading/empty/error/Continue flow), RequireRequester
guard (AC-02), Ticket Detail (owned ticket display, not-found state,
attachment removal).

**E2E and Responsive/Visual QA (e2e/) — `npx playwright test`**
```
13 passed (20.5s)
```
Covers: full create-to-list flow (E2E-01), cross-Requester ownership block
via client-side navigation (E2E-02), attachment upload/remove/blocked-
download (E2E-03), 9 responsive screenshots across desktop/tablet/mobile
for Create Ticket, My Tickets, and Ticket Detail, plus the initial smoke test.

**Total: 58 tests passing, 0 failing, 0 skipped.**

## 7. Known Limitations or Deferred Tests

None remaining — all previously identified gaps (AC-02, BR-06, BR-14) now have
automated coverage as of the test-coverage pass (Issue #21).