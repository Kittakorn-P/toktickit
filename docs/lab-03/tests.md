# TokTickIT — Sprint 3 Test Plan & Traceability (tests.md)

Status: LIVING DOCUMENT — updated as each issue lands. Issue 2 (Auth & Migration
Foundation) section is complete; Issue 3/4 sections are placeholders to fill in as those
issues are implemented.

---

## Issue 2 — Auth & Migration Foundation

| Test ID | Type | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, BR-01 | Valid login | Authenticated session + correct role returned | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-02 | API | BR-11 | Invalid password login | Generic `INVALID_CREDENTIALS`, no field-specific leak | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-03 | API | AC-03, BR-14 | Inactive account login | Identical generic error to API-02 (verified byte-identical response) | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-04 | API | AC-05, BR-13 | Logout | Session destroyed; subsequent `/api/auth/me` with same cookie returns 401 | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-05 | API | AC-04, BR-02 | Mandatory password change | `mustChangePassword` blocks nothing on `/me` or `/change-password` itself, flips to false after valid change | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-06 | API | AC-06, BR-15 | Current-user scoping | `/api/auth/me` returns only the session's own identity | manual (curl walkthrough) — automate before Issue 5 close | Pass (manual) |
| API-07 | API | BR-06 (mid-session deactivation) | User deactivated after login | Next request with the same session returns 401 | server/tests/lab-02/requester-deactivation.api.test.ts | Pass |
| API-08 | API | BR-06 (mid-session deactivation, ticket creation path) | User deactivated after login attempts to create a Ticket | 401, no ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pass |

**Manual tests API-01 through API-06** were verified via the curl walkthrough during
Issue 2 but are not yet automated. Add to Issue 5 scope: convert each into a Vitest +
Supertest case in a new `server/tests/lab-03/auth.api.test.ts`.

---

## Known Debt — Header-to-Session Rewrite (owned by Issue 5)

Migrating Lab 2 routes (`tickets.ts`, `attachments.ts`) from `X-Requester-Id` header auth
to session-based auth (Issue 2) left the following existing Lab 2 tests semantically
stale — they still call `.set("X-Requester-Id", ...)`, which the routes no longer read.
All currently fail with `401` instead of their intended assertion. This is expected,
tracked debt, not a new defect. Each needs rewriting to log in via
`POST /api/auth/login` and reuse the returned session cookie (see
`requester-deactivation.api.test.ts` and the new mid-session-deactivation test in
`create-ticket.api.test.ts` for the pattern to follow).

| File | Test | Current Status |
|---|---|---|
| `attachments.api.test.ts` | uploads a valid PNG and returns 201 | 401 (stale header) |
| `attachments.api.test.ts` | rejects an unsupported file type with 400 | 401 (stale header) |
| `attachments.api.test.ts` | rejects a file over 5MB with 400 | `ECONNRESET` — likely `requireAuth` rejecting before multer finishes streaming the body; resolves once rewritten to use a real session |
| `attachments.api.test.ts` | rejects a 6th active attachment with 409 | 401 (stale header) |
| `attachments.api.test.ts` | rejects an upload to a ticket owned by another requester with 404 | 401 (stale header) |
| `attachments.api.test.ts` | soft-removes an owned attachment and it becomes non-downloadable | crashes reading `listRes.body.attachments[0]` — upstream 401 means the list is empty/undefined |
| `attachments.api.test.ts` | rejects removal of an attachment owned by another requester with 404 | crashes reading `listRes.body.attachments.find(...)` — same upstream cause |
| `attachments.api.test.ts` | keeps the Ticket intact and retrievable after a failed attachment upload | 401 (stale header) |
| `create-ticket.api.test.ts` | creates a ticket and returns 201 with a generated ticketNumber | 401 (stale header) |
| `create-ticket.api.test.ts` | returns 400 with field errors when Summary is missing | 401 (stale header) |
| `create-ticket.api.test.ts` | returns 400 when Category is invalid | 401 (stale header) |
| `create-ticket.api.test.ts` | returns 404 for a ticket belonging to a different requester | 401 (stale header) |
| `create-ticket.api.test.ts` | returns 404 (identical shape) for a ticket id that does not exist | 401 (stale header) |
| `my-tickets.api.test.ts` | returns only the requesting requester's own tickets | 401 (stale header) |
| `my-tickets.api.test.ts` | filters by search text against summary | 401 (stale header) |
| `my-tickets.api.test.ts` | returns an empty array (not an error) when a filter matches nothing | 401 (stale header) |
| `my-tickets.api.test.ts` | falls back to default page/pageSize on invalid pagination params | 401 (stale header) |
| `my-tickets.api.test.ts` | includes pagination metadata | crashes reading `res.body.pagination` — upstream 401 means body has no `pagination` key |

**Two tests intentionally kept as-is** (still correct even post-migration, since they test
the *absence* of valid auth, which is still true whether the mechanism is a header or a
session):
- `create-ticket.api.test.ts` — "returns 401 when X-Requester-Id header is missing"
- `create-ticket.api.test.ts` — "returns 401 when X-Requester-Id refers to an inactive requester"

These can stay, or be renamed/duplicated with session-based equivalents in Issue 5 for
clarity — not required, just a naming nit.

**Also flagged during Issue 2, not yet resolved:** confirm no other test files
create throwaway `User` rows without a cleanup step (`prisma.user.delete(...)` in the
test or an `afterEach`) — the four orphaned "Temp Session Test" rows found in Prisma
Studio came from exactly this gap in one file; worth a repo-wide check before Issue 5
closes.

---

## Issue 3 — IT Staff Ticket Queue + Ticket Detail
TODO — fill in as implemented.

## Issue 4 — Administrator User Management
TODO — fill in as implemented.

## Issue 5 — Regression, QA & Release
TODO — this issue's scope is largely defined by the "Known Debt" table above, plus:
- Automate API-01 through API-06 (currently manual-only)
- Full E2E pass across all new screens
- Responsive/visual checklist (ui-spec.md §12, Lab 2 §16)
- Repo-wide check for orphaned test-created users