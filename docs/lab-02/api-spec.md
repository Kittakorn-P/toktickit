# Lab 2 API Contract (api-spec.md)

All Requester-scoped endpoints require an `X-Requester-Id` header identifying the
currently selected Development Requester (see specification.md, Section 11 —
Assumptions). The backend validates this ID against the active Requester list on every
request; it is never trusted blindly.

---

## 1. GET /api/categories

Retrieve active Categories.

**Request:** none

**Response 200:**
```json
{
  "categories": [
    { "id": 1, "name": "Hardware" },
    { "id": 2, "name": "Software" }
  ]
}
```

**Errors:** 500 (unexpected server error, safe generic message).

---

## 2. GET /api/related-systems

Retrieve active Related Systems.

**Request:** none

**Response 200:**
```json
{
  "relatedSystems": [
    { "id": 1, "name": "Corporate Laptop" },
    { "id": 2, "name": "Campus Wi-Fi" }
  ]
}
```

**Errors:** 500.

---

## 3. GET /api/requesters

Retrieve active Development Requesters (for the Selector screen). Inactive Requesters
are never included (BR-16).

**Request:** none

**Response 200:**
```json
{
  "requesters": [
    { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" }
  ]
}
```

**Errors:** 500.

---

## 4. POST /api/tickets

Create a Ticket for the currently selected Requester.

**Headers:** `X-Requester-Id: <id>` (required)

**Request body:**
```json
{
  "categoryId": 1,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle, started after last update.",
  "requestedPriority": "MEDIUM"
}
```

**Response 201:**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "categoryId": 1,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle, started after last update.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-21T10:00:00Z"
}
```

**Validation failures (400):**
```json
{ "errors": { "summary": "Summary is required.", "categoryId": "Category is required." } }
```

**Errors:**
- 400 — missing/invalid required fields, invalid categoryId/relatedSystemId reference
- 401 — missing or invalid `X-Requester-Id` header (Requester not found or inactive)
- 500 — unexpected server error (Ticket not created; safe generic message)

---

## 5. GET /api/tickets

Retrieve the selected Requester's own Tickets — paginated, searchable, filterable,
sortable (BR-08, BR-10).

**Headers:** `X-Requester-Id: <id>` (required)

**Query parameters:**
| Param | Values | Default |
|---|---|---|
| `search` | free text, matched against Ticket Number and Summary | none |
| `category` | categoryId | none |
| `requestedPriority` | LOW / MEDIUM / HIGH | none |
| `status` | NEW / ... | none |
| `sort` | `createdAt`, `-createdAt`, `updatedAt`, `-updatedAt`, `ticketNumber`, `-ticketNumber` | `-createdAt` |
| `page` | integer ≥ 1 | 1 |
| `pageSize` | integer 1–50 | 10 |

Invalid/out-of-range parameters are ignored and fall back to defaults (BR-10) rather than
returning an error.

**Response 200:**
```json
{
  "tickets": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "category": "Hardware",
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-21T10:00:00Z",
      "updatedAt": "2026-08-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

**Errors:**
- 401 — missing/invalid Requester header
- 500 — unexpected server error

---

## 6. GET /api/tickets/:id

Retrieve one owned Ticket. Ownership enforced per BR-07 (404 if not owned, indistinguishable
from not-found per BR-19).

**Headers:** `X-Requester-Id: <id>` (required)

**Response 200:** full Ticket object (same shape as POST response, plus relatedSystem and
category names resolved).

**Errors:**
- 401 — missing/invalid Requester header
- 404 — Ticket does not exist OR exists but is not owned by this Requester (identical
  response body/status in both cases)
- 500 — unexpected server error

---

## 7. POST /api/tickets/:id/attachments

Upload an Attachment to an owned Ticket (multipart/form-data).

**Headers:** `X-Requester-Id: <id>` (required)

**Request:** multipart form with `file` field.

**Response 201:**
```json
{
  "id": 7,
  "ticketId": 42,
  "originalFilename": "screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 204800,
  "isRemoved": false,
  "createdAt": "2026-08-21T10:05:00Z"
}
```

**Errors:**
- 400 — unsupported file type or file exceeds 5MB (BR-13)
- 401 — missing/invalid Requester header
- 404 — Ticket not found or not owned
- 409 — Ticket already has 5 active Attachments (BR-13)
- 500 — unexpected server error (upload failed; Ticket remains saved per BR-14)

---

## 8. GET /api/tickets/:id/attachments

Retrieve Attachment metadata for an owned Ticket (includes removed Attachments, marked).

**Headers:** `X-Requester-Id: <id>` (required)

**Response 200:**
```json
{
  "attachments": [
    {
      "id": 7,
      "originalFilename": "screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 204800,
      "isRemoved": false,
      "createdAt": "2026-08-21T10:05:00Z"
    },
    {
      "id": 6,
      "originalFilename": "old-log.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 51200,
      "isRemoved": true,
      "removedAt": "2026-08-20T09:00:00Z"
    }
  ]
}
```

**Errors:** 401, 404 (Ticket not found/not owned), 500.

---

## 9. GET /api/attachments/:id/download

Download an active Attachment's file content.

**Headers:** `X-Requester-Id: <id>` (required)

**Response 200:** binary file stream with appropriate `Content-Type` and
`Content-Disposition: attachment; filename="..."`.

**Errors:**
- 401 — missing/invalid Requester header
- 404 — Attachment does not exist, is not owned by this Requester, OR has been soft-removed
  (all three cases return identical 404, per BR-16/BR-19 pattern — a removed Attachment is
  not downloadable, and its removed state is not distinguished from not-found to keep the
  same no-information-leak posture)
- 500 — unexpected server error

---

## 10. PATCH /api/attachments/:id/remove

Soft-remove an Attachment on an owned Ticket (BR-16). The frontend shows a simple "Are you
sure?" confirmation dialog before calling this endpoint — no reason text is required.

**Headers:** `X-Requester-Id: <id>` (required)

**Request body:** none required.

**Response 200:**
```json
{
  "id": 7,
  "isRemoved": true,
  "removedAt": "2026-08-21T10:10:00Z"
}
```

**Errors:**
- 401 — missing/invalid Requester header
- 404 — Attachment not found, not owned, or already removed
- 500 — unexpected server error

---

## HTTP Status Summary

| Status | Meaning in this API |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created (Ticket, Attachment) |
| 400 | Invalid input / validation failure |
| 401 | Missing or invalid Requester context |
| 404 | Resource not found OR not owned (indistinguishable) |
| 409 | Conflict (e.g., 5-attachment limit reached) |
| 500 | Unexpected server error (safe, generic message, no stack trace exposed) |