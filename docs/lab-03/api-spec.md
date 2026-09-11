# TokTickIT — Sprint 3 API Contract (api-spec.md)

## Authentication Mechanism

Sprint 3 replaces the `X-Requester-Id` header (Lab 2's Development Requester selector)
with real session-based authentication.

- On successful login, the server creates a server-side session and sets an `httpOnly`,
  `sameSite: lax` session cookie. The client never handles a token directly.
- Every protected endpoint reads the authenticated user from the session — never from a
  client-supplied header, body field, or query parameter (BR-03, BR-15).
- Logout destroys the server-side session; the cookie is cleared (BR-13).
- Passwords are hashed with bcrypt before storage; plaintext is never persisted or logged
  (BR-12).
- All Lab 2 Requester-scoped endpoints (`/api/tickets`, `/api/attachments/...`) continue to
  work identically, but now resolve the Requester from the session instead of
  `X-Requester-Id`. The header is removed entirely.

---

## 1. POST /api/auth/login

Authenticate with email and password.

**Request body:**
```json
{ "email": "janderson@tiktockit.com", "password": "correcthorsebattery" }
```

**Response 200:**
```json
{
  "user": { "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER" },
  "mustChangePassword": false
}
```

**Errors:**
- 400 — missing email or password
- 401 — invalid credentials OR inactive account (identical generic message in both cases,
  BR-11, BR-14): `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." } }`
- 500 — unexpected server error

---

## 2. POST /api/auth/logout

Invalidate the current session (BR-13).

**Request:** none (session cookie only)

**Response 200:**
```json
{ "success": true }
```

**Errors:** 500.

---

## 3. GET /api/auth/me

Retrieve the current authenticated user's identity and role (BR-15). Never trusts a
client-supplied id.

**Response 200:**
```json
{ "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER", "mustChangePassword": false }
```

**Errors:**
- 401 — no valid session

---

## 4. POST /api/auth/change-password

Set a new password. Required before any other endpoint succeeds if `mustChangePassword`
is true (BR-02).

**Request body:**
```json
{ "currentPassword": "temp-initial-pw", "newPassword": "NewSecure123!" }
```

**Response 200:**
```json
{ "success": true }
```

**Errors:**
- 400 — new password fails complexity rules, or matches current password
- 401 — no valid session, or `currentPassword` incorrect
- 500 — unexpected server error

---

## 5. GET /api/staff/tickets

IT Staff Ticket Queue — searchable, filterable, sortable, paginated (same envelope
pattern as Lab 2's `GET /api/tickets`).

**Authorization:** IT Staff or Administrator only (403 otherwise).

**Query parameters:**
| Param | Values | Default |
|---|---|---|
| `search` | free text, matched against Ticket Number and Summary | none |
| `category` | categoryId | none |
| `itPriority` | LOW / MEDIUM / HIGH | none |
| `status` | NEW / OPEN / IN_PROGRESS / WAITING_FOR_REQUESTER / RESOLVED / CLOSED / REOPENED / CANCELLED | none |
| `owner` | userId, or `unassigned` | none |
| `sort` | `createdAt`, `-createdAt`, `updatedAt`, `-updatedAt`, `itPriority`, `-itPriority` | `-createdAt` |
| `page` | integer ≥ 1 | 1 |
| `pageSize` | integer 1–50 | 10 |

Invalid/out-of-range parameters fall back to defaults rather than erroring (consistent
with Lab 2's BR-10 pattern).

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
      "itPriority": "MEDIUM",
      "currentStatus": "IN_PROGRESS",
      "owner": { "id": 3, "name": "Michael Brown" },
      "updatedAt": "2026-09-02T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1 }
}
```

**Errors:**
- 401 — no valid session
- 403 — authenticated but not IT Staff/Administrator
- 500

---

## 6. GET /api/staff/tickets/:id

Retrieve one Ticket for IT Staff operations (full detail, no ownership restriction beyond
role).

**Authorization:** IT Staff or Administrator only.

**Response 200:** full Ticket object including `requester`, `owner`, `itPriority`,
`currentStatus`, `category`, `relatedSystem`, `attachments`.

**Errors:**
- 401, 403
- 404 — Ticket does not exist
- 500

---

## 7. PATCH /api/staff/tickets/:id/claim

Claim an unassigned Ticket, or reassign an already-owned Ticket to another active
IT Staff/Administrator (BR-16, BR-17).

**Authorization:** IT Staff or Administrator only.

**Request body:**
```json
{ "ownerId": 3 }
```

**Response 200:**
```json
{ "id": 42, "owner": { "id": 3, "name": "Michael Brown" } }
```

**Errors:**
- 400 — `ownerId` does not refer to an active IT Staff/Administrator user
- 401, 403
- 404 — Ticket not found
- 500

---

## 8. PATCH /api/staff/tickets/:id/priority

Set IT Priority (BR-18). Independent of Requested Priority, which never changes.

**Authorization:** IT Staff or Administrator only.

**Request body:**
```json
{ "itPriority": "HIGH" }
```

**Response 200:**
```json
{ "id": 42, "itPriority": "HIGH" }
```

**Errors:**
- 400 — invalid priority value
- 401, 403
- 404
- 500

---

## 9. PATCH /api/staff/tickets/:id/status

Change Ticket status (BR-21 — role-gated, no further transition restriction in Sprint 3).

**Authorization:** IT Staff or Administrator only. A Requester calling this endpoint
receives 403, never a silent no-op.

**Request body:**
```json
{ "status": "RESOLVED" }
```

**Response 200:**
```json
{ "id": 42, "currentStatus": "RESOLVED" }
```

**Errors:**
- 400 — `status` is not one of the required Ticket statuses
- 401, 403
- 404
- 500

---

## 10. POST /api/tickets/:id/comments

Post a Public Comment (BR-19). Shared endpoint — usable by the owning Requester, IT
Staff, or Administrator.

**Authorization:** Requester (must own the Ticket), IT Staff, or Administrator.

**Request body:**
```json
{ "content": "We are investigating the issue on your device." }
```

**Response 201:**
```json
{
  "id": 15,
  "ticketId": 42,
  "author": { "id": 3, "name": "Michael Brown", "role": "IT_STAFF" },
  "content": "We are investigating the issue on your device.",
  "createdAt": "2026-09-02T10:05:00Z"
}
```

**Errors:**
- 400 — empty or whitespace-only content (BR-22)
- 401 — no valid session
- 403 — Requester does not own this Ticket
- 404 — Ticket not found (or not owned, indistinguishable from 403 per Lab 2's
  no-leak pattern — returned as 404 to a Requester, 403 reserved for role mismatch)
- 500

---

## 11. GET /api/tickets/:id/comments

Retrieve Public Comments for a Ticket.

**Authorization:** owning Requester, IT Staff, or Administrator.

**Response 200:**
```json
{
  "comments": [
    {
      "id": 15,
      "author": { "id": 3, "name": "Michael Brown", "role": "IT_STAFF" },
      "content": "We are investigating the issue on your device.",
      "createdAt": "2026-09-02T10:05:00Z"
    }
  ]
}
```

**Errors:** 401, 403/404 (as above), 500.

---

## 12. POST /api/tickets/:id/notes

Create an Internal Note (BR-04, BR-20). Never reachable by a Requester.

**Authorization:** IT Staff or Administrator only.

**Request body:**
```json
{ "content": "Escalating to hardware vendor for battery replacement." }
```

**Response 201:**
```json
{
  "id": 8,
  "ticketId": 42,
  "author": { "id": 3, "name": "Michael Brown" },
  "content": "Escalating to hardware vendor for battery replacement.",
  "createdAt": "2026-09-02T10:06:00Z"
}
```

**Errors:**
- 400 — empty/whitespace-only content
- 401 — no valid session
- 403 — Requester attempting access (generic forbidden response, no note content or
  existence revealed, per BR-20)
- 404 — Ticket not found
- 500

---

## 13. GET /api/tickets/:id/notes

Retrieve Internal Notes for a Ticket.

**Authorization:** IT Staff or Administrator only.

**Response 200:**
```json
{
  "notes": [
    {
      "id": 8,
      "author": { "id": 3, "name": "Michael Brown" },
      "content": "Escalating to hardware vendor for battery replacement.",
      "createdAt": "2026-09-02T10:06:00Z"
    }
  ]
}
```

**Errors:** 401, 403 (Requester — same safe non-revealing response as above), 404, 500.

---

## 14. GET /api/admin/users

Retrieve the user list — search by name/email, optional role filter (no mandatory
pagination/sort, per handout §8.5).

**Authorization:** Administrator only.

**Query parameters:**
| Param | Values | Default |
|---|---|---|
| `search` | free text, matched against name and email | none |
| `role` | REQUESTER / IT_STAFF / ADMINISTRATOR | none |

**Response 200:**
```json
{
  "users": [
    { "id": 1, "name": "Jennifer Anderson", "email": "janderson@tiktockit.com", "role": "REQUESTER", "isActive": true }
  ]
}
```

**Errors:** 401, 403, 500.

---

## 15. POST /api/admin/users

Create a user with one role and an initial password (BR-06).

**Authorization:** Administrator only.

**Request body:**
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@tiktockit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "Temp1234!"
}
```

**Response 201:**
```json
{
  "id": 9,
  "name": "Alex Thompson",
  "email": "alex.thompson@tiktockit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": true
}
```

**Errors:**
- 400 — missing/invalid fields, invalid role value
- 401, 403
- 409 — email already in use (BR-07)
- 500

---

## 16. PATCH /api/admin/users/:id

Update a user's name, email, role, and/or activation state (BR-06, BR-08, BR-09, BR-10).

**Authorization:** Administrator only.

**Request body (any subset):**
```json
{ "name": "Alex T. Thompson", "role": "ADMINISTRATOR", "isActive": false }
```

**Response 200:** updated user object (same shape as #15 response, minus password fields).

**Errors:**
- 400 — invalid field values
- 401, 403
- 404 — user not found
- 409 — email already in use (BR-07), OR request would deactivate the caller's own
  account (BR-08), OR would leave zero active Administrators (BR-10)
- 500

---

## 17. PATCH /api/admin/users/:id/password

Set a new initial password for a user; forces a password change at next login (BR-02).

**Authorization:** Administrator only.

**Request body:**
```json
{ "newInitialPassword": "Temp5678!" }
```

**Response 200:**
```json
{ "id": 9, "mustChangePassword": true }
```

**Errors:**
- 400 — password fails complexity rules
- 401, 403
- 404 — user not found
- 500

---

## HTTP Status Summary

| Status | Meaning in this API |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created (user, comment, note) |
| 400 | Invalid input / validation failure |
| 401 | No valid session (not authenticated) |
| 403 | Authenticated but forbidden by role or ownership |
| 404 | Resource not found (or, for Requester-owned resources, not owned — indistinguishable) |
| 409 | Conflict (duplicate email, self-deactivation, last-Administrator removal) |
| 500 | Unexpected server error (safe, generic message, no stack trace exposed) |