# TokTickIT — Sprint 4 UI Specification

Extends the Zen Green UI established in Lab 2 and extended in Lab 3. Reuses existing
badge, tab, button, form, table, card, loading, empty, and error conventions — no new
visual language is introduced in Lab 4.

---

## 1. Navigation

- Add a **Dashboard** nav item, role-aware:
  - Requester → routes to Requester Dashboard, label "Dashboard"
  - IT Staff / Admin → routes to Staff Dashboard, label "Dashboard"
- Active-page indication (existing underline/highlight convention) applies to Dashboard
  like every other nav item.
- Dashboard is the default landing route after login for all roles (replacing the
  previous default of My Tickets / Ticket Queue).

## 2. IT Staff / Admin Dashboard

**Route:** `/dashboard` (staff/admin)

**Layout (desktop):** 5 metric cards in a single row → 2 content panels below
(70/30 split: "My Recent Tickets" list / "Quick Actions").

**Metric cards** (label / value / delta vs. yesterday, optional):
| Card | Metric | Drill-down |
|---|---|---|
| New | count, status = New | Ticket Queue filtered `status=New` |
| Open | count, status = Open | Ticket Queue filtered `status=Open` |
| In Progress | count, status = In Progress | Ticket Queue filtered `status=In Progress` |
| Waiting for Requester | count, status = Waiting for Requester | Ticket Queue filtered accordingly |
| My Assigned | count, ownerId = current user, status not in {Closed, Cancelled} | Ticket Queue filtered `owner=me` |

**My Recent Tickets:** last 5 tickets touched by/relevant to the current user
(owned or acted-on), sorted by `updatedAt` desc, each row → Ticket Detail. "View all"
→ full Ticket Queue.

**Quick Actions:** Create Ticket, Search Tickets, My Queue (existing actions, reused).

**States:**
- *Loading:* skeleton cards + skeleton rows (existing shimmer pattern), no layout shift
  once data arrives.
- *Empty (My Recent Tickets):* "No recent activity yet" with a Create Ticket CTA.
- *Forbidden:* not applicable at the page level (route is role-gated); a metric card
  whose query the user isn't authorized for is simply not rendered rather than shown
  with an error.
- *Safe failure:* if a metric fetch fails, that card shows "—" with a retry icon and a
  toast; other cards render independently (partial failure isolation, not a full-page
  error).

**Responsive:**
- Tablet: cards wrap 3+2; My Recent Tickets and Quick Actions stack vertically.
- Mobile: cards stack 1-per-row; Quick Actions become a horizontal icon row above the
  list; no horizontal scrolling anywhere.

## 3. Requester Dashboard

**Route:** `/dashboard` (requester)

**Layout:** 4 metric cards → "My Recent Tickets" / "Quick Actions" panels (same
70/30 pattern as staff, scaled to 4 cards).

**Metric cards:**
| Card | Metric | Drill-down |
|---|---|---|
| My Open Tickets | count, requesterId = me, status in {New, Open, Reopened} | My Tickets filtered |
| In Progress | count, requesterId = me, status in {In Progress, Waiting for Requester} | My Tickets filtered |
| Resolved | count, requesterId = me, status = Resolved | My Tickets filtered |
| Closed | count, requesterId = me, status = Closed | My Tickets filtered |

**My Recent Tickets:** last 5 of the Requester's own tickets by `updatedAt` desc.
**Quick Actions:** Create Ticket, View My Tickets.

**States:** same loading/empty/safe-failure conventions as §2, scoped to the
authenticated Requester only. Backend ownership enforcement means there is no
"forbidden" state reachable from this screen under normal use — attempting to fetch
another user's dashboard via a crafted request returns 403 and the UI treats that as a
generic error toast (no data shown).

**Responsive:** same breakpoints/behavior as §2.

## 4. Actions Taken Panel (Ticket Detail)

**Location:** new section on the existing Ticket Detail screen, below the Ticket
summary/status area and above (or alongside, per existing layout) Comments/Notes.

**View mode (all roles with access to the Ticket):**
- Table/list, oldest → newest, each row: Action Date/Time, Description (truncated with
  expand), Result, Performed By, Follow-Up badge (Yes/No — non-color icon + text, not
  color alone), Attachment Notes.
- Requesters see this exact list, read-only — no Add/Edit controls rendered (not just
  disabled) for Requester role.

**Create mode (IT Staff/Admin only):**
- "Add Action" button above the list opens an inline form (not a modal, to avoid the
  inaccessible-modal pitfall) with fields: Description (textarea, required), Result
  (textarea, required), Follow-Up Required? (toggle/checkbox), Follow-up Note
  (textarea, shown/required only when Follow-Up = yes), Attachment Notes (text,
  optional).
- Action Date/Time and Performed By are not editable inputs — shown as read-only
  preview text ("will be recorded as you, now") before submit.
- Submit disabled while a request is in flight (prevents duplicate-click double
  submission per §8.5 of the handout).

**Edit mode (author or Admin):**
- "Edit" affordance per row (visible only to the author/Admin per BR from
  specification.md); reuses the same inline form pre-filled; Action Date/Time and
  Performed By remain read-only.

**States:**
- *Empty:* "No actions recorded yet" (+ "Add the first action" CTA for IT Staff/Admin).
- *Validation:* inline field errors (e.g., missing Follow-up Note when Follow-Up = yes),
  matching existing form-error styling; focus moves to the first invalid field.
- *Conflict (409):* toast "This ticket was updated elsewhere — refreshing" and the panel
  reloads before allowing another submit.
- *Forbidden:* Add/Edit controls simply absent for unauthorized roles (backend is the
  real gate; this is presentation only).

## 5. Ticket Status Control

- Existing status badge/control on Ticket Detail is extended to only list transitions
  valid for (current status × current user's role) per specification.md §5.1.
- If no transitions are available (terminal state, or role has none from this status),
  the control renders disabled with a tooltip/helper text explaining why.
- On successful transition, the Ticket summary badge and any dependent UI (e.g.,
  Actions Taken empty-state prompts) refresh without a full page reload.
- Requester-only affordance: "Looks Resolved" toggle/button, visually distinct from the
  status control, with helper text clarifying it does not change the Ticket status by
  itself. When set, IT Staff/Admin see an indicator on the Ticket ("Requester indicates
  resolved") near the status control.

## 6. Visual, Accessibility & Responsive Checklist (Lab 4)

- [ ] Dashboard nav item present for all roles with correct active-state
- [ ] All metric cards have a visible label + value + accessible name (not icon-only)
- [ ] Follow-Up status uses icon + text, never color alone
- [ ] All interactive elements (cards, rows, buttons, toggles) have visible keyboard
      focus and are reachable via Tab in a logical order
- [ ] Actions Taken form fields have `label`/`for`–`id` pairing (per the Lab 3
      accessibility fix — do not regress it)
- [ ] Inline Actions Taken form used instead of a modal (avoids inaccessible-modal
      dialog issue)
- [ ] No clipped content, overlapping controls, or horizontal page scroll at
      320px/768px/1024px+ widths
- [ ] Loading, empty, forbidden, and safe-failure states verified for every new screen
      (both dashboards, Actions Taken panel)
- [ ] No leftover temporary/duplicate/obsolete elements from Labs 1–3
- [ ] Desktop, tablet, and mobile screenshots captured for both dashboards and the
      Actions Taken panel (for `artifacts/lab-04/screenshots/`)