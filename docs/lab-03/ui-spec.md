# TokTickIT — Sprint 3 UI Specification (ui-spec.md)

Color tokens, typography/spacing, field states, button hierarchy, responsive breakpoints,
and accessibility rules are inherited unchanged from `docs/lab-02/ui-spec.md` (§1–§6,
§14–§15). This document covers only screens that are new or changed in Sprint 3, plus new
tokens needed for ticket status and role badges.

---

## 1. New Tokens (additive to Lab 2's table)

| Token | Value | Usage |
|---|---|---|
| Info blue | bg `#E3F2FD`, text `#0D47A1` | Status: Open |
| Neutral gray | bg `#EEEEEE`, text `#424242` | Status: Closed, Cancelled |
| Muted purple | bg `#F1E9FA`, text `#5B3A8E` | Status: Waiting for Requester |
| Internal Note tint | bg `#FFF8E7`, left border `#B9770E` | Internal Note card background (distinct from the Medium-priority amber pill) |

## 2. Status Badges (8 required statuses)

| Status | Token used |
|---|---|
| New | Secondary green pill (per Lab 2 §13) |
| Open | Info blue |
| In Progress | Warning amber pill (existing token, repurposed here for "active work") |
| Waiting for Requester | Muted purple |
| Resolved | Pale green bg + secondary-green text (success token) |
| Closed | Neutral gray |
| Reopened | Error-red-tinted pill (existing token, lighter tint than field-error red) |
| Cancelled | Neutral gray, text struck through |

All badges keep the pill shape + always-present text label from Lab 2 §13 — color is
never the only signal.

## 3. Role Badges

Small rounded tags (not full pills) used next to author names in Comments/Notes and in
the Admin user list:

| Role | Style |
|---|---|
| Requester | Outline only, secondary-green text/border, white fill |
| IT Staff | Primary green fill, white text |
| Administrator | Dark charcoal fill (`#1C2B24`), white text |

---

## 4. Login Screen

- Centered card, same shell treatment as Lab 2's Requester Selector screen (§9), which
  this screen replaces entirely — no "this is not a login screen" note, since it now is one.
- Fields: Email address, Password (with show/hide toggle).
- States: initial, validation (empty field on submit attempt), busy (Sign In button
  spinner), failure (single inline banner: "Invalid email or password. Please try again." —
  same message for wrong credentials and inactive account, per BR-11/BR-14).
- No "Forgot your password" action — password reset by email is explicitly out of scope
  (§4.2); omit it entirely rather than showing a disabled/dead link.
- Primary "Sign In" button, disabled until both fields are non-empty.

## 5. Change Password Screen (mandatory first login)

- Shown immediately after login when `mustChangePassword` is true; no other screen is
  reachable until this succeeds (BR-02).
- Fields: Current (temporary) password, New password, Confirm new password — all with
  show/hide toggles.
- Live password-rule checklist below the New password field (✓/✗ per rule as the user
  types): minimum length, upper/lower case, number + special character.
- States: validation (rules unmet, or confirm mismatch), busy, failure (safe generic
  message), success → redirects straight into the app shell.
- Primary "Continue" button, disabled until all rules pass and confirm matches.

## 6. Application Shell and Navigation (replaces Lab 2 §8)

- Header: TokTickIT logo/name (left); role-specific nav links (center-left); current
  user's name + role badge + Logout action (right, via a Profile dropdown).
- Nav links by role:
  - Requester: My Tickets, Create Ticket
  - IT Staff: My Queue
  - Administrator: Users
- The Development Requester display and "Change Requester" action are removed entirely —
  no trace of the Lab 2 selector remains in the shell.
- Active nav item indicated the same way as Lab 2 (underline + bold, not color alone).
- Mobile (<768px): same collapse-to-menu behavior as Lab 2; user name/role/logout remain
  reachable without horizontal scroll.

## 7. Requester Ticket Detail — Additions (extends Lab 2 §12)

Everything in Lab 2 §12 remains (read-only header grid, Attachments panel). Added for
Sprint 3:
- **Public Comments panel**, same tabbed/sectioned placement as the IT Staff version
  (§10 below) — comment list (author name + role badge + timestamp + content) and an
  "Add Comment" input with a Post button.
- **"Mark Problem as Resolved" button** (secondary style) — posts the Requester's
  indication without changing formal status (BR-05). On click, shows a confirmation
  toast ("Thanks — IT Staff will confirm final resolution.") rather than any status
  badge change on this screen.
- Internal Notes remain entirely absent from this screen — not hidden via CSS, simply
  never requested or rendered for a Requester session (BR-20 enforced by what the
  frontend asks for, backed by server-side rejection regardless).

## 8. IT Staff Ticket Queue

- Header row: page title "My Queue," no "Create Ticket" action (IT Staff don't create
  tickets on this screen).
- Filter bar: search input (Ticket No./Summary), Category / Requested Priority /
  IT Priority / Status / Owner dropdowns, "Clear Filters" tertiary button — same visual
  treatment as Lab 2's filter bar.
- **Desktop table — 8 columns** (Last Updated dropped to keep the grid readable):
  Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Status,
  Owner. Sortable column headers reuse Lab 2's ▲▼ convention.
- **Mobile — card list** (one ticket per card): Ticket No. + Status badge (top row),
  Summary (below), Requested/IT Priority badges + Owner name (bottom row). Tap anywhere
  on the card opens Ticket Detail.
- Pagination: same Previous/page-numbers/Next control as Lab 2.
- Empty state: "No tickets in the queue" (only when the queue is genuinely empty across
  all IT Staff, not just this filter).
- No-results state: "No tickets match your search/filters" + Clear Filters.
- Forbidden state: if a non-IT-Staff/Administrator somehow lands here directly, show the
  same safe "You don't have access to this page" panel used elsewhere, not a raw 403.

## 9. IT Staff Ticket Detail

Extends the Lab 2 Ticket Detail read-only grid with:
- **Ticket Owner** — dropdown of active IT Staff/Administrator users (or "Unassigned"),
  editable inline; "Claim" quick-action button when unassigned.
- **IT Priority** — dropdown, editable, visually adjacent to (but clearly separate from)
  the read-only Requested Priority badge so the two are never confused.
- **Status** — dropdown showing all 8 statuses (BR-21 — no transition restriction beyond
  role), styled as an editable field per Lab 2's editable-field token, not a plain badge,
  since it's actionable here.
- **Tabbed panel**: Public Comments | Internal Notes | Attachments (Attachments reuses
  the Lab 2 panel as-is).
  - Public Comments: identical layout/behavior to the Requester-facing version.
  - Internal Notes: same list/input pattern, but every note card uses the Internal Note
    tint token (§1) and a small "Internal — not visible to Requester" label at the top of
    the panel, so the distinction is visible even before reading any content.

## 10. Administrator — User List

- Header: page title "Users," primary "+ Create User" button (top-right).
- Filter bar: search input (name/email), optional Role dropdown filter. No pagination or
  multi-column sort — explicitly out of scope (§4.2), so the list simply renders all
  matching users.
- Table columns: Name, Email, Role (role badge, §3), Status (Active/Inactive pill), Edit
  action (opens the panel below).
- Empty/no-results states follow the same pattern as My Tickets/Queue.

## 11. Administrator — Create / Edit User Panel

Side panel (or modal on mobile), not a full page navigation, matching the handout's
mockup layout.

- **Create mode** fields: Full Name *, Email Address *, Role * (dropdown: Requester /
  IT Staff / Administrator), Active toggle (default Yes), Initial Password * (plain text
  input, admin sets it directly).
  - Deviation from the handout's mockup, flagged deliberately: the mockup shows a "Send
    password reset email" checkbox. Email delivery of credentials is explicitly excluded
    in §4.2, so this is replaced with a plain Initial Password field and a static note:
    "User must change this password at first login." No checkbox, no email is ever sent.
- **Edit mode** fields: Full Name, Email Address, Role, Active toggle (all editable) —
  no password field inline; a separate "Set New Password" action opens a small
  confirmation step that sets a new initial password (mustChangePassword forced true).
- Actions: primary "Save User" always present. In Edit mode only, a destructive-style
  "Deactivate User" (or "Activate User" if currently inactive) button appears, disabled
  with a tooltip if this is the caller's own account (BR-08) or would remove the last
  active Administrator (BR-10) — the disabled state itself is the safe failure feedback,
  backed by the same 409 rejection server-side if somehow submitted anyway.
- Validation: duplicate email shown as an inline field error under Email Address
  ("This email is already in use"), not a top-of-form banner.

## 12. Screen Modes and Feedback — Summary

All new screens follow Lab 2's state model (§7 of Lab 2's spec): initial, loading,
validation, submitting/busy, success, failure — plus, where applicable here, forbidden
(role mismatch) and conflict (409s: duplicate email, self-deactivation, last-admin
removal), each shown as a specific inline or banner message, never a generic error.

## 13. Screenshot Paths

```
artifacts/lab-03/screenshots/
├── authentication/      (desktop, tablet, mobile — login initial/failure, change-password)
├── staff-queue/         (desktop, tablet, mobile — populated, empty, no-results)
├── staff-ticket-detail/ (desktop, tablet, mobile — claim, priority, status, comments, notes)
└── user-management/     (desktop, tablet, mobile — list, create panel, edit panel, validation)
```