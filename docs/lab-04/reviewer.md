# TokTickIT — Sprint 4 Reviewer Log (reviewer.md)

**Reviewer:** Lathapol Srikhiao (@Lathapol)  
**Author:** Kittakorn P. (@Kittakorn-P)

This log traces each Sprint 4 feature branch from PR open through review comments,
author responses, and final approval, in the order the branches were merged into
`lab4-staging`.

---

## PR 1 — Sprint 4 Engineering Contract
**Branch:** `feature/lab4-spec-contract` → `lab4-staging`  
**PR link:** https://github.com/Kittakorn-P/toktickit/pull/49  
**Files:** `docs/lab-04/specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md` (draft)  
**Comments from Lathapol:** the .md look fine start on the lab

---

## PR 2 — Actions Taken Foundation
**Branch:** `feature/lab4-actions-taken-foundation` → `lab4-staging`  
**PR link:** https://github.com/Kittakorn-P/toktickit/pull/50  
**Files:** `ActionTaken` Prisma model/migration, `staffTickets.ts`/`tickets.ts` route
additions (create/edit Actions Taken, matrix-enforced status transitions,
Reopen/Looks-Resolved), `ticketTransitions.ts`, backend test suites  
**Comments from Lathapol:** read through the routes, create/edit and the
requester read-only look right. A few things to fix before merge: closed/cancelled
tickets still accept new actions; PATCH action returns 500 if description/
followUpNote isn't a string, and no max lengths; the stale check is skipped when
updatedAt isn't sent (and it isn't atomic); only the author/admin can edit an
action, but the handout says IT Staff can update; no double-click protection yet;
no gate for resolved without an action yet, ok if that's next PR.  
**Author response:** Fixed all the issue now.pls review again  
**Status:** Approved after fixes, merged.

---

## PR 3 — Actions Taken UI + Ticket Workflow
**Branch:** `feature/lab4-actions-taken-ui` → `lab4-staging`  
**PR link:** https://github.com/Kittakorn-P/toktickit/pull/51  
**Files:** Requester `TicketDetail.tsx` (read-only Actions Taken panel, persisted
Looks-Resolved flag, Reopen), `StaffTicketDetail.tsx` (Actions Taken create/edit
form, matrix-restricted status control), `ticketTransitions.ts` (client),
`api.ts` additions, component test suites  
**Comments from Lathapol:** read through, actions form and requester reopen/looks-resolved look right. concurrency handled with the ticket's updatedAt and ConflictError, validation errors separated from conflicts, double click guarded on submit. merging  

---

## PR 4 — Role Dashboards
**Branch:** `feature/lab4-dashboards` → `lab4-staging`  
**PR link:** https://github.com/Kittakorn-P/toktickit/pull/52  
**Files:** `dashboard.ts` routes (Requester/Staff metrics), `Dashboard.tsx`,
`RequesterDashboard.tsx`, `StaffDashboard.tsx`, `AppShell.tsx` nav + active-state,
multi-status drill-down filter support on `tickets.ts`/`staffTickets.ts`,
`MyTickets.tsx`/`StaffQueue.tsx` URL-param sync, full test suites  
**Comments from Lathapol:** read through, dashboard routes and the comma-separated status drill-down look right and match the cards. requester scoped to req.user.id server side, good. one thing to watch for next pr: staff dashboard has no unassigned count or priority breakdown, handout 8.1 wants both. merging this one

---

## PR 5 — Final Regression & Hardening
**Branch:** `feature/lab4-final-hardening` → `lab4-staging`
**PR link:** https://github.com/Kittakorn-P/toktickit/pull/53
**Files:** Lab 4 E2E specs and screenshots, Lab 2/3 E2E fixes, revised `specification.md`, `api-spec.md`, `tests.md`, `ui-spec.md`, README, `reviewer.md`, `ai-use.md`
**Comments from [reviewer]:** read through, docs, screenshots and the e2e specs look fine and the readme covers all four labs. one thing to check later: ticket-resolution spec resolves a ticket with no action taken, handout says resolve should need one, so it will break if you add that gate. merging

---

## Final Release
**Branch:** `lab4-staging` → `main`

---

## Summary

| PR | Branch | Status |
|---|---|---|
| 1 | feature/lab4-spec-contract | Merged |
| 2 | feature/lab4-actions-taken-foundation | Merged (1 review round) |
| 3 | feature/lab4-actions-taken-ui | Merged |
| 4 | feature/lab4-dashboards | Merged |
| 5 | feature/lab4-final-hardening | [pending] |
| Final | lab4-staging → main | [pending] |