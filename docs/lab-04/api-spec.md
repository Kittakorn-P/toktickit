# TokTickIT — Sprint 4 API Specification

Extends the REST API from Labs 2–3. Authentication is the existing cookie session
(express-session); `requireAuth` identifies the user and `requireRole` restricts each
router. Ids are integers. Timestamps are ISO 8601 in UTC. Ticket statuses are
`NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED`.

> **Revision note:** revised after implementation to describe what shipped. The first
> draft used one shared set of paths for both roles and a `{code, message}` error shape;
> the real API splits paths by role and uses the shapes in §5.

---

## 1. Actions Taken

### `GET /api/tickets/:id/actions` (Requester)
Own ticket only, oldest to newest.
- **200** `{ "actions": [ <Action> ] }`
- **404** `{ "error": "Ticket not found." }` for a missing ticket *or* one owned by someone
  else (the two are indistinguishable on purpose)
- **401 / 403** if not logged in / not a Requester

### `GET /api/staff/tickets/:id/actions` (IT Staff, Administrator)
Any ticket, oldest to newest.
- **200** `{ "actions": [ <Action> ] }`; **404** ticket not found; **401 / 403**

An `<Action>`:
```json
{
  "id": 12, "ticketId": 7,
  "actionDateTime": "2026-09-20T10:15:00.000Z",
  "description": "Replaced network cable, tested connection",
  "result": "Connectivity restored",
  "performedById": 10, "performedBy": { "id": 10, "name": "Priya Nair" },
  "followUpRequired": false, "followUpNote": null,
  "attachmentNotes": "See photo IMG_0231.jpg in ticket folder",
  "createdAt": "2026-09-20T10:16:02.000Z", "updatedAt": "2026-09-20T10:16:02.000Z"
}
```

### `POST /api/staff/tickets/:id/actions` (IT Staff, Administrator)
Body: `description`*, `result`*, `followUpRequired` (boolean), `followUpNote`, `attachmentNotes`.
`performedBy` and `actionDateTime` in the body are ignored.
- **201** the new `<Action>`
- **200** the *existing* `<Action>` if the same person sent the same description and result
  for this ticket within the last 5 seconds (BR-13); no second row is created
- **422** `{ "errors": { "description": "...", "followUpNote": "Follow-up note is required when follow-up is needed." } }`
  for a missing/non-string field, an over-length field (4000/4000/2000/1000), or a missing
  follow-up note
- **422** `{ "error": "Cannot add an action to a CLOSED ticket." }` (Closed or Cancelled, BR-11)
- **404** ticket not found; **401 / 403** (a Requester gets 403)

### `PATCH /api/staff/tickets/:id/actions/:actionId` (IT Staff, Administrator)
Any IT Staff member or Administrator may edit any action. Body: any of `description`,
`result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, plus **required** `updatedAt`
(the value from the last read). `actionDateTime`, `performedBy`, and `ticketId` cannot change.
- **200** the updated `<Action>`
- **400** `{ "error": "updatedAt is required to edit an action." }`
- **409** `{ "error": "This action was modified elsewhere.", "current": <Action> }`: the
  check is part of the single `UPDATE ... WHERE id AND updatedAt` statement, so two
  simultaneous edits cannot both succeed
- **422** `{ "errors": {...} }` (types, lengths, follow-up rule) or
  `{ "error": "Cannot edit an action on a CLOSED ticket." }`
- **404** action not found or not on this ticket; **401 / 403**

---

## 2. Ticket Status and Workflow

### `PATCH /api/staff/tickets/:id/status` (IT Staff, Administrator)
Body: `{ "status": "RESOLVED", "updatedAt": "<last known>" }` (`updatedAt` optional).
- **200** `{ "id", "currentStatus", "updatedAt" }`
- **400** `{ "error": "A valid status is required." }` (not one of the eight values)
- **422** `{ "error": "Cannot move from NEW to IN_PROGRESS." }` (not in the matrix,
  `specification.md` §5.1)
- **409** `{ "error": "This ticket was updated elsewhere.", "current": <Ticket> }` when a
  supplied `updatedAt` is stale
- **404** ticket not found; **401 / 403** (a Requester gets 403)

### `PATCH /api/tickets/:id/status` (Requester)
Body: `{ "status": "REOPENED", "updatedAt": "<optional>" }`.
- **200** `{ "id", "currentStatus": "REOPENED", "updatedAt" }`
- **403** `{ "error": "You don't have access to this transition." }` for any status other than REOPENED
- **404** not found or not the caller's ticket
- **422** `{ "error": "Cannot move from <status> to REOPENED." }` unless the ticket is RESOLVED
- **409** stale `updatedAt`, same shape as above

### `PATCH /api/tickets/:id/looks-resolved` (Requester)
Body: `{ "looksResolved": true }`. Allowed in any status; never changes `currentStatus`.
- **200** `{ "id", "looksResolvedByRequester": true }`
- **400** `{ "error": "looksResolved must be a boolean." }`; **404** not found or not the
  caller's; **401 / 403**

---

## 3. Dashboards

Counts are live and calculated exactly as in `specification.md` §5.2.

### `GET /api/dashboard/requester` (Requester)
Takes no parameters, so it cannot be pointed at another user's data.
```json
{
  "metrics": { "myOpen": 3, "inProgress": 2, "resolved": 5, "closed": 12 },
  "recentTickets": [
    { "id": 7, "code": "TKT-2026-000007", "title": "Laptop battery drains quickly",
      "status": "IN_PROGRESS", "updatedAt": "2026-09-20T09:14:00.000Z" }
  ]
}
```
At most 5 recent tickets, newest-updated first. With no tickets: all zeros and `[]` (still 200).
**403** for IT Staff/Administrator; **401** if not logged in; **500** `{ "error": "Unable to load dashboard." }`.

### `GET /api/dashboard/staff` (IT Staff, Administrator)
```json
{
  "metrics": { "new": 14, "open": 23, "inProgress": 18, "waitingForRequester": 7, "myAssigned": 16 },
  "recentTickets": [ { "id": 7, "code": "...", "title": "...", "status": "OPEN", "updatedAt": "..." } ]
}
```
The first four are organization-wide; `myAssigned` is the caller's own non-Closed/Cancelled
tickets; recent tickets are those the caller owns or has acted on. **403** for a Requester.

---

## 4. Changes to Existing List Endpoints

- `GET /api/tickets` and `GET /api/staff/tickets`: `status` now accepts a comma-separated
  list (`?status=NEW,OPEN,REOPENED`); unrecognized values are ignored. A single value works
  as before.
- `GET /api/staff/tickets?owner=` accepts `unassigned` or a user id (unchanged from Lab 3;
  the dashboard's "My Assigned" link uses it).

---

## 5. Shared Conventions

- **Auth failures** come from the middleware: `401 { "error": { "code": "UNAUTHENTICATED", "message": "Not logged in." } }`
  and `403 { "error": { "code": "FORBIDDEN", "message": "You don't have access to this resource." } }`.
- **Errors from the routes** are `{ "error": "message" }`; **field validation errors** are
  `{ "errors": { "field": "message" } }`. No stack traces or internals are returned.
- **Status codes used:** 200, 201, 400, 401, 403, 404, 409, 422, 500.
- **Concurrency:** action edits require `updatedAt` and are checked atomically; status
  changes check it only when supplied (see Known Limitations).
- **Duplicate submissions:** the create-action backstop (BR-13) returns the existing record
  with 200. It compares ticket, author, description, and result only, so the same text with
  different follow-up settings inside 5 seconds also counts as a duplicate. The UI also
  disables the submit button while a request is in flight.
- **Existing endpoints** (login, tickets, attachments, comments, notes, staff claim/priority,
  admin users) are unchanged apart from the status filter in §4.

### Known limitations
- Status-change concurrency is optional and read-then-write; a client that omits `updatedAt`
  skips the check.
- A malformed (non-date) `updatedAt` on an action edit returns 500 instead of 400.
- Dashboards return a fixed list of 5 recent tickets with no paging.