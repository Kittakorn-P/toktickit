# Lab 2 UI Specification

## 1. Color Tokens

| Token | Value | Usage |
|---|---|---|
| Primary green | `#006B3C` | App header background, primary buttons, strong emphasis |
| Secondary green | `#0B7A46` | Active tab underline, focus outlines, links, hover states |
| Pale green | `#EAF6EF` | Selected rows, success banners, subtle section backgrounds |
| Page background | `#F5F7F6` | Overall app background |
| Surface / card | `#FFFFFF` | Cards, panels, form containers — subtle border + light shadow |
| Text | Dark charcoal-green (`#1C2B24`) | Body text, not pure black |
| Editable field | White bg, `#CBD5D1` border | Inputs the Requester can type into |
| Read-only field | `#F3F1E8` (warm ivory) bg | System-generated values (Ticket Number, Ticket Date, Ticket Owner) |
| Error | `#B3261E` text/border | Field-level validation messages |
| Warning | Amber `#B9770E` badge | Reserved for genuine warnings only, not decoration |
| Success | Secondary green text/icon | Confirmation messages, submitted state |

## 2. Typography and Spacing

- Base font size 16px, line-height 1.5, for body text and form labels.
- Headings use the same font family, weight 600, sized 24px (page title) / 18px (section
  title) / 14px (field label).
- Spacing scale: 4px base unit — 8px between label and field, 16px between fields, 24px
  between form sections, 32px page padding on desktop (16px on mobile).

## 3. Field States

- **Editable**: white background, neutral border, secondary-green focus ring.
- **Read-only**: ivory background, no focus ring, cursor `not-allowed` styling, still
  legible (not greyed to illegibility).
- **Invalid**: red border + red message directly below the field (never only a
  top-of-form summary).
- **Disabled**: reduced opacity (~50%), `not-allowed` cursor, cannot receive focus or
  input.
- **Focused**: visible outline (secondary green, 2px), never removed for keyboard users.

## 4. Required-Field Marker and Validation Placement

- Required fields show a red asterisk immediately after the label text (e.g.
  `Summary *`).
- The asterisk alone is not sufficient — a validation message must appear directly below
  the field on blur or on submit attempt, in the Error token color.
- Messages are specific (e.g. "Summary must not be empty"), never a generic "Invalid
  input."

## 5. Button Hierarchy

| Type | Style |
|---|---|
| Primary | Solid primary green background, white text — one per screen/section (e.g. Submit, Continue) |
| Secondary | White background, secondary-green border and text (e.g. Cancel, Change Requester) |
| Tertiary | Text-only, secondary-green, no border/background (e.g. Clear Filters) |
| Destructive | White background, error-red border and text (e.g. Remove Attachment) |
| Disabled | Any variant at reduced opacity, no hover/focus response |
| Busy | Primary button shows an inline spinner + disabled state while a request is in flight (e.g. "Submitting…") |

## 6. Attachment Selection and Error Presentation

- Selected files appear as a list below the file picker with filename, size, and a remove
  (✕) control before upload.
- An invalid file (wrong type or >5MB) is rejected immediately with an inline message
  under the picker (e.g. "File exceeds 5MB limit") and is not added to the pending list.
- Once 5 active Attachments exist, the file picker becomes disabled with a message
  explaining the limit.

## 7. Screen States (Create Ticket, My Tickets, Ticket Detail all apply)

- **Initial**: default empty/loaded state.
- **Loading**: skeleton or spinner while fetching reference data or Ticket list.
- **Validation**: inline field errors shown, form otherwise unchanged.
- **Submitting**: primary button busy state, all fields disabled to prevent edits mid-request.
- **Success**: confirmation banner/panel showing the generated Ticket Number (Create Ticket)
  or updated state (Attachment actions).
- **Failure**: safe error banner ("Something went wrong, please try again"), entered field
  values preserved (BR-12), no technical error detail exposed to the Requester.

## 8. Application Shell and Navigation

- Header: TokTickIT logo/name (left), My Tickets + Create Ticket nav links (center/left),
  current Requester name + Change Requester dropdown action (right).
- Active nav item indicated with secondary-green underline or pale-green background —
  never color alone (also bold weight or icon change for accessibility).
- Mobile (<768px): nav collapses into a hamburger/menu icon; Requester display and Change
  Requester action remain reachable without horizontal scrolling.

## 9. Development Requester Selection Screen

- Centered card, TokTickIT title above.
- Short explanatory text: "This is not a login screen. Authentication is introduced in
  Lab 3."
- Single dropdown, `Development Requester *`, populated from `GET /api/requesters`.
- States: loading (spinner in place of dropdown), empty (message: "No active Development
  Requesters available — contact your instructor"), API failure (safe error message +
  Retry action).
- Primary "Continue" button, disabled until a Requester is selected.

## 10. Create Ticket Screen Layout

- **Top section** (read-only, ivory background): Ticket Number ("will be generated on
  submit" placeholder), Ticket Date (current date/time), Requester (from context).
- **Classification section** (editable): Category dropdown, Related System dropdown,
  Requested Priority dropdown — grouped together.
- **Content section**: Summary (single-line input, full width), Description (multi-line
  textarea, resizable vertically only, generous default height).
- **Attachments section**: file picker + selected-file list, placed below Description.
- **Actions**: primary "Submit Ticket" button and secondary "Cancel" button, bottom of
  form, right-aligned on desktop / full-width stacked on mobile.

## 11. My Tickets Screen Layout

- Header row: page title, "Create Ticket" primary button (top-right on desktop, full-width
  on mobile).
- Filter bar: search input (Ticket Number/Summary), Category / Requested Priority /
  IT Priority / Current Status dropdowns, "Clear Filters" tertiary button.
- **Desktop**: table with sortable column headers (▲▼ indicators) — Ticket No., Created
  Date, Summary, Category, Requested Priority, Current Status, Last Updated.
- **Mobile**: table becomes a stacked card list — each card shows Ticket No., Summary,
  Status badge, and Last Updated, tap-to-open for full detail.
- Pagination controls at the bottom (Previous / page numbers / Next), consistent across
  breakpoints.
- **Empty state**: "You haven't created any tickets yet" + Create Ticket call-to-action
  (shown only when the Requester truly has zero Tickets — BR-17).
- **No-results state**: "No tickets match your search/filters" + Clear Filters action
  (shown when filters exclude all Tickets).

## 12. Requester Ticket Detail Screen Layout

- Breadcrumb: "My Tickets > Ticket Detail" with a "Back to My Tickets" action.
- Read-only header grid: Ticket No., Ticket Date, Category, Related System, Requester,
  Requested Priority, Current Status — visually distinguished (ivory background) from any
  interactive element on the page.
- Summary and Description shown as read-only text blocks below the grid.
- **Attachments panel**, clearly separated (bordered card) from Ticket info:
  - Active Attachments: filename, size, Download and Remove actions.
  - Removed Attachments: filename shown greyed/struck-through, no Download action, labeled
    "Removed."
  - "Add Attachment" control at the top of the panel, subject to the same 5-file/5MB/type
    rules as Create Ticket.
- No Public Comments, Internal Notes, or Actions Taken sections appear on this screen
  (explicitly excluded from Lab 2 scope).

## 13. Priority and Status Badges

- Badges use pill shape, colored background + dark text (never color alone — include the
  text label, e.g. "Medium", "In Progress").
- Requested Priority: Low = pale green, Medium = amber, High = red-tinted.
- Current Status: New = secondary-green pill (only status Lab 2 produces).
- Consistent badge component reused across My Tickets list and Ticket Detail.

## 14. Responsive Layout Rules

| Viewport | Behavior |
|---|---|
| Desktop ≥992px | Multi-column layout, content max-width ~1200px, centered |
| Tablet 768–991px | Two-column layout where practical; Summary/Description retain full usable width |
| Mobile <768px | Single-column, fields stack vertically, buttons full-width and touch-sized (min 44px height), no horizontal scrolling anywhere |
| All sizes | No clipped labels, no overlapping messages, no hidden buttons, attachment filenames truncate with ellipsis rather than overflow |

## 15. Accessibility

- All form controls have associated `<label>` elements (not placeholder-only labeling).
- Icon-only controls (e.g. remove ✕, sort arrows) include `aria-label` and a visible
  tooltip on hover/focus.
- Focus order follows visual/logical order; focus indicators are never suppressed.
- Status/priority information is never conveyed by color alone — text label always present.
- All interactive elements reachable and operable via keyboard alone (Tab, Enter, Space).

## 16. Visual Inspection Checklist

- [ ] Colors match token table (no ad-hoc hex values in components)
- [ ] Editable vs. read-only fields are visually distinct at a glance
- [ ] Every required field shows both asterisk and (on invalid) inline message
- [ ] Button hierarchy consistent across all three screens
- [ ] Busy/disabled states visually distinguishable from normal state
- [ ] No clipping, overlap, or horizontal scroll at desktop/tablet/mobile
- [ ] Badges legible and consistent between My Tickets and Ticket Detail

## 17. Screenshot Paths

```
artifacts/lab-02/screenshots/
├── create-ticket/       (desktop, tablet, mobile — initial, validation, success, failure)
├── my-tickets/          (desktop, tablet, mobile — populated, empty, no-results)
└── ticket-detail/       (desktop, tablet, mobile — with active + removed attachments)
```