# TokTickIT — Sprint 4 API Specification

Extends the REST API from Labs 2–3. All endpoints require authentication
(existing session/JWT middleware) unless noted. All responses use the existing
Lab 2/3 error envelope: `{ "error": { "code": string, "message": string } }`.

---

## 1. Actions Taken

### `GET /api/tickets/:ticketId/actions`
List all Actions Taken for a Ticket, oldest → newest.

- **Access:** Requester (only if they own `:ticketId`), IT Staff/Admin (only if
  authorized to view the ticket, per existing Lab 3 ticket-access rules)
- **200 OK**
```json
{
  "actions": [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "actionDateTime": "2026-09-20T10:15:00Z",
      "description": "Replaced network cable, tested connection",
      "result": "Connectivity restored",
      "performedBy": { "id": "uuid", "name": "Michael Tan" },
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": "See photo IMG_0231.jpg in ticket folder",
      "createdAt": "2026-09-20T10:16:02Z",
      "updatedAt": "2026-09-20T10:16:02Z"
    }
  ]
}
```
- **403** — Requester requesting a ticket they don't own; IT Staff without access
- **404** — ticket does not exist (or, for a Requester probing another's ticket ID,
  404 is returned instead of 403 to avoid confirming the ticket exists)

### `POST /api/tickets/:ticketId/actions`
Create an Action Taken.

- **Access:** IT Staff/Admin only (authorized on the ticket)
- **Request body**
```json
{
  "description": "Replaced network cable, tested connection",
  "result": "Connectivity restored",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See photo IMG_0231.jpg in ticket folder"
}
```
  `performedBy` and `actionDateTime` are never accepted from the client — set
  server-side from the authenticated session and `now()`.
- **201 Created** — full Action Taken object (shape as in GET)
- **422 Unprocessable Entity** — validation failure, e.g.:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "followUpNote is required when followUpRequired is true" } }
```
- **403** — role/ticket-access check failed
- **404** — ticket not found

### `PATCH /api/tickets/:ticketId/actions/:actionId`
Edit an existing Action Taken (description, result, followUpRequired, followUpNote,
attachmentNotes only — `actionDateTime`, `performedBy`, `ticketId` are immutable).

- **Access:** the original author, or any Admin
- **Request body:** partial object of the editable fields, plus `updatedAt` (the
  client's last-known value, for concurrency check)
```json
{
  "result": "Connectivity restored; monitored for 24h, stable",
  "updatedAt": "2026-09-20T10:16:02Z"
}
```
- **200 OK** — updated Action Taken object
- **409 Conflict** — `updatedAt` does not match current record (BR-09); response
  includes the current record so the client can reload:
```json
{ "error": { "code": "STALE_UPDATE", "message": "This action was modified elsewhere" }, "current": { "...": "..." } }
```
- **422** — same validation rule as POST (follow-up note requirement)
- **403** — not the author and not an Admin
- **404** — action or ticket not found

---

## 2. Ticket Status / Workflow

### `PATCH /api/tickets/:ticketId/status`
Transition a Ticket's status.

- **Access:** gated by the matrix in `specification.md` §5.1 — most transitions are
  IT Staff/Admin only; Requesters may only perform `Resolved → Reopened`.
- **Request body**
```json
{ "status": "Resolved", "updatedAt": "2026-09-20T09:00:00Z" }
```
- **200 OK** — updated Ticket summary object (id, status, updatedAt, ownerId, etc.)
- **409 Conflict** — stale `updatedAt`, same shape as Actions Taken PATCH
- **422** — requested transition not permitted from the current status
  (`{ "error": { "code": "INVALID_TRANSITION", "message": "Cannot move from Resolved to Open" } }`)
- **403** — role not permitted to perform this transition from this status
- **404** — ticket not found

### `PATCH /api/tickets/:ticketId/looks-resolved`
Requester sets/clears the advisory "looks resolved" flag.

- **Access:** Requester who owns the ticket only
- **Request body:** `{ "looksResolved": true }`
- **200 OK** — updated Ticket summary (includes `looksResolvedByRequester`)
- **403 / 404** — as above

---

## 3. Dashboards

### `GET /api/dashboard/requester`
- **Access:** authenticated Requester; always scoped to `requesterId = current user`
  server-side (the endpoint takes no ticket-owner parameter — it cannot be pointed at
  another user's data)
- **200 OK**
```json
{
  "metrics": {
    "myOpen": 3,
    "inProgress": 2,
    "resolved": 5,
    "closed": 12
  },
  "recentTickets": [
    { "id": "uuid", "code": "TKT-2026-001234", "title": "Laptop battery drains quickly", "status": "In Progress", "updatedAt": "2026-09-20T09:14:00Z" }
  ]
}
```
- Empty state: `recentTickets: []`, all metric values `0` — not an error.

### `GET /api/dashboard/staff`
- **Access:** IT Staff/Admin
- **200 OK**
```json
{
  "metrics": {
    "new": 14,
    "open": 23,
    "inProgress": 18,
    "waitingForRequester": 7,
    "myAssigned": 16
  },
  "recentTickets": [
    { "id": "uuid", "code": "TKT-2026-001234", "title": "Laptop battery drains quickly", "status": "In Progress", "updatedAt": "2026-09-20T09:14:00Z" }
  ]
}
```
- `myAssigned` is scoped to `ownerId = current user`; the other four metrics are
  org-wide counts by status, matching §2 of `ui-spec.md`.
- Empty state: same shape, zeroed/empty — not an error.

---

## 4. Shared Conventions

- **Auth:** every endpoint above reuses the existing Lab 2/3 auth middleware; no new
  auth mechanism is introduced.
- **Concurrency:** any endpoint that mutates a Ticket or Action Taken requires the
  client to send the resource's last-known `updatedAt`; mismatch → `409` with the
  current record attached, per BR-09.
- **Idempotency / duplicate submission:** POST/PATCH handlers are safe to retry —
  a retried POST with an identical payload and no state change since the first success
  is treated as a normal new request (client-side duplicate-click prevention is the
  primary defense per `ui-spec.md` §4; the server does not need special dedup logic
  beyond the concurrency check, since Actions Taken are additive by nature).
- **Status codes used:** `200, 201, 400, 401, 403, 404, 409, 422, 500` — consistent
  with Labs 2–3.