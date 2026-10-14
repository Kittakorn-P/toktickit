# TokTickIT — Sprint 4 UI Specification

Extends the Zen Green UI established in Lab 2 and extended in Lab 3. Reuses the
existing badge, button, form, table, card, loading, empty, and error conventions;
no new visual language is introduced in Lab 4.

> **Revision note:** this file was first written before implementation and has been
> revised to describe what actually shipped. The original draft is in git history.
> Where the build differs from that draft, it is listed in §7.

---

## 1. Navigation

- A **Dashboard** nav item is shown to every role and links to `/dashboard`.
- Every nav item (Dashboard, My Tickets, Create Ticket, My Queue, Users) is a
  `NavLink`. The active page is shown **bold and underlined** (a non-color cue).
  Lab 3's nav had no active-page indication at all, so this is new in Lab 4.
- On narrow screens the nav collapses behind a ☰ button; the same links appear in the
  expanded menu.
- `/` redirects every role to `/dashboard`. This replaces the Lab 3 per-role redirect
  (Requester → My Tickets, IT Staff → Queue, Administrator → Users).

## 2. IT Staff / Administrator Dashboard

**Route:** `/dashboard` (IT Staff and Administrator share this screen).

**Header:** "Welcome back, {name}!" and a one-line subtitle.

**Metric cards** (label + value; each card is a link):

| Card | Metric | Drill-down link |
|---|---|---|
| New | tickets with status New | `/queue?status=NEW` |
| Open | status Open | `/queue?status=OPEN` |
| In Progress | status In Progress | `/queue?status=IN_PROGRESS` |
| Waiting for Requester | status Waiting for Requester | `/queue?status=WAITING_FOR_REQUESTER` |
| My Assigned | owned by the current user, status not Closed/Cancelled | `/queue?owner={current user id}` |

The first four are organization-wide counts; only My Assigned is scoped to the caller.
All counts are calculated by the backend (`GET /api/dashboard/staff`).

**My Recent Tickets:** up to 5 tickets the caller owns *or* has recorded an Action
Taken on, newest-updated first. Each row (ticket number, summary, status badge) links
to `/queue/{id}`. "View all" links to `/queue`.

**Quick Actions:** Search Tickets (`/queue`) and My Queue (`/queue?owner={id}`).

**States**
- *Loading:* five skeleton placeholder cards.
- *Empty:* "No recent activity yet." in the recent-tickets panel; metric cards show 0.
- *Failure:* a single error alert, "Unable to load your dashboard right now. Please try
  again." The whole dashboard fails together (see §7).
- *Forbidden:* the endpoint returns 403 to a Requester. The UI never routes a Requester
  to the staff dashboard, so this is only reachable by a hand-crafted request.

**Responsive** (Bootstrap grid): at 768px and up the five cards share one row and the
recent-tickets and Quick Actions panels sit side by side (2/3 and 1/3 width). Below
768px the cards wrap two per row and the two panels stack vertically.

## 3. Requester Dashboard

**Route:** `/dashboard` (Requester).

**Metric cards** (backend: `GET /api/dashboard/requester`, always scoped to the
logged-in Requester; the endpoint accepts no user id):

| Card | Metric | Drill-down link |
|---|---|---|
| My Open Tickets | status New, Open, or Reopened | `/tickets?status=NEW,OPEN,REOPENED` |
| In Progress | status In Progress or Waiting for Requester | `/tickets?status=IN_PROGRESS,WAITING_FOR_REQUESTER` |
| Resolved | status Resolved | `/tickets?status=RESOLVED` |
| Closed | status Closed | `/tickets?status=CLOSED` |

**My Recent Tickets:** the Requester's 5 most recently updated tickets, each linking to
`/tickets/{id}`; "View all" links to `/tickets`.

**Quick Actions:** "+ Create Ticket" (`/create-ticket`) and "View My Tickets" (`/tickets`).

**States and responsive behavior:** same as §2. Four cards share a row at 768px and up
and wrap two per row below that.

## 4. List screens: drill-down support

- **My Tickets** reads `search`, `category`, `requestedPriority`, `status`, and `sort`
  from the URL on load and when the URL changes.
- **My Queue** reads `search`, `itPriority`, `status`, `owner`, and `sort` the same way.
  When `owner` equals the current user's id the heading becomes "My Assigned Tickets",
  and whenever any filter is active a "Filtered view / Clear Filters" bar is shown.
- `status` accepts a comma-separated list. The status dropdown has no single option for a
  multi-status value, so it will not show a matching selection, but the filter is applied.

## 5. Ticket Detail

### 5.1 Actions Taken: IT Staff / Administrator view

A card titled "Actions Taken (n)" sits below the ticket summary/description and above
the Comments/Notes card.

- **List:** oldest to newest. Each entry shows date/time, a follow-up badge, Description,
  Result, the Follow-up note (only when follow-up is required), Attachment notes (only
  when present), and "Performed by {name}".
- **Follow-up badge:** "⚠ Follow-up needed" or "✓ No follow-up". The meaning is carried
  by the icon and text, not by color alone.
- **Add:** a "+ Add Action" button in the card header opens an **inline form** (no modal)
  with Action Description*, Result*, Follow-Up Required? (checkbox), Follow-up Note (shown
  only when the checkbox is on), and Attachment Notes. Action date/time and Performed by
  are not form inputs; the server records them (the author and "now").
- **Edit:** an "Edit" button on each entry reopens the same form pre-filled. Any IT Staff
  member or Administrator may edit any action; it is not limited to the author.
- **While saving:** the submit button shows "Saving…" and is disabled, and Cancel is
  disabled, so a double click cannot submit twice.
- **Closed or Cancelled tickets:** Add and Edit are hidden and the card shows "This ticket
  is {closed|cancelled}: actions can no longer be added or edited."
- **Validation:** field errors from the API (e.g. a missing Follow-up Note) appear inline
  under the field; other errors appear in an alert at the top of the form. The form stays
  open and keeps what was typed.
- **Stale edit (409):** the form shows "This action was updated elsewhere: refreshing."
  and the list reloads.
- **Empty:** "No actions recorded yet."

### 5.2 Actions Taken: Requester view

The same list on the Requester's own ticket, read-only. No Add or Edit controls are
rendered at all. It appears after the Looks-Resolved/Reopen buttons and above
Attachments.

### 5.3 Ticket status control (IT Staff / Administrator)

- The status dropdown lists the current status plus only the transitions permitted from
  it (client copy of the matrix in `specification.md` §5.1). The backend re-checks every
  change.
- When no transition is available (Closed, Cancelled) or a save is in progress, the
  dropdown is disabled; with no transitions, helper text reads "No further transitions
  available from this status."
- A rejected change (422) or a stale one (409) shows an alert above the summary; a stale
  change also reloads the ticket.
- When the Requester has marked the ticket as appearing resolved, a **"Requester
  indicates resolved"** badge appears next to the Current Status label.

### 5.4 Looks Resolved and Reopen (Requester)

- **"Mark Problem as Resolved"** sets an advisory flag only; the ticket status does not
  change. After it is set the button reads "✓ Marked as appears resolved", is disabled,
  and the page says "Thanks — IT Staff will confirm final resolution." The flag survives
  a reload. The UI has no way to unset it (the API does).
- **"Reopen Ticket"** appears only while the ticket is Resolved and moves it to Reopened.
- The Requester's screen has no status dropdown, so no other transition is offered.

## 6. Visual, Accessibility & Responsive Checklist (Lab 4)

Screenshots (desktop 1280×900, tablet 820×1180, mobile 375×812) are generated by
`e2e/lab-04/responsive.spec.ts` into `artifacts/lab-04/screenshots/`.

- [x] Dashboard nav item shown to all roles with an active-page indication (bold +
      underline; asserted in `e2e/lab-04/dashboards.spec.ts`)
- [x] Metric cards have a visible label and value and an accessible name (each card is a
      link; asserted by link name in the dashboard component tests)
- [x] Follow-up status uses icon + text, never color alone
- [x] Actions Taken form fields have `label`/`for`–`id` pairing (tests find them with
      `getByLabel`)
- [x] Actions Taken uses an inline form, not a modal
- [x] Loading, empty, failure, and forbidden states exist for both dashboards and the
      Actions Taken card (forbidden = controls not rendered / API 403; see §2)
- [x] Desktop, tablet, and mobile screenshots captured for both dashboards and the
      Actions Taken list and add form
- [ ] Keyboard-only pass (Tab order, visible focus). Dashboards, nav, and the new forms
      use native links, buttons, and inputs, but a manual pass has not been done yet.
- [ ] No clipped content, overlapping controls, or horizontal scroll: confirm by looking
      at the screenshots. Only 375, 820, and 1280px widths were captured; 320px was not.
- [ ] No leftover temporary/obsolete elements from Labs 1–3: the Lab 2 Development
      Requester scaffolding (`/api/requesters`, `getRequesters`, `requesterHeaders`) is
      still in the code base and has not been removed or confirmed unused.

## 7. Known gaps and deviations from the original draft

**Deviations (decided during implementation):**
- Dashboards load and fail as a whole, not per card. Every other screen in the app uses
  one load state, and per-card isolation would need several endpoints.
- No "change since yesterday" figure on the cards.
- Failure feedback is an inline alert, not a toast.
- Description text is shown in full (no truncate/expand).
- No focus move to the first invalid field after a failed submit.
- Staff Quick Actions have no Create Ticket (IT Staff do not create tickets).

**Known accessibility gaps (inherited from Labs 2–3, not introduced in Lab 4):**
- The Status, IT Priority, and Ticket Owner controls, and the read-only fields on both
  Ticket Detail screens, have no `htmlFor`/`id` pairing with their labels.
- The clickable rows and cards on My Tickets and My Queue respond to the mouse only; they
  are not keyboard focusable. The dashboard's recent-ticket rows are real links and are
  not affected.