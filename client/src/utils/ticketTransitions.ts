import type { Role } from "../api.js";

export type TicketStatus =
  | "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER"
  | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";

type Transition = { to: TicketStatus; roles: Role[] };

const STAFF: Role[] = ["IT_STAFF", "ADMINISTRATOR"];

// Mirrors server/src/utils/ticketTransitions.ts (specification.md §5.1).
// UI-only — this decides which options to show in the status control, not
// what's actually allowed. The backend re-checks every request regardless.
export const TICKET_TRANSITIONS: Record<TicketStatus, Transition[]> = {
  NEW: [
    { to: "OPEN", roles: STAFF },
    { to: "CANCELLED", roles: STAFF },
  ],
  OPEN: [
    { to: "IN_PROGRESS", roles: STAFF },
    { to: "CANCELLED", roles: STAFF },
  ],
  IN_PROGRESS: [
    { to: "WAITING_FOR_REQUESTER", roles: STAFF },
    { to: "RESOLVED", roles: STAFF },
    { to: "CANCELLED", roles: STAFF },
  ],
  WAITING_FOR_REQUESTER: [
    { to: "IN_PROGRESS", roles: STAFF },
    { to: "RESOLVED", roles: STAFF },
    { to: "CANCELLED", roles: STAFF },
  ],
  RESOLVED: [
    { to: "CLOSED", roles: STAFF },
    { to: "REOPENED", roles: ["REQUESTER", ...STAFF] },
  ],
  CLOSED: [
    { to: "REOPENED", roles: STAFF },
  ],
  REOPENED: [
    { to: "IN_PROGRESS", roles: STAFF },
    { to: "WAITING_FOR_REQUESTER", roles: STAFF },
    { to: "CANCELLED", roles: STAFF },
  ],
  CANCELLED: [],
};

export function allowedTransitions(from: TicketStatus, role: Role): TicketStatus[] {
  const allowed = TICKET_TRANSITIONS[from] ?? [];
  return allowed.filter((t) => t.roles.includes(role)).map((t) => t.to);
}

export const TERMINAL_STATUSES: TicketStatus[] = ["CLOSED", "CANCELLED"];