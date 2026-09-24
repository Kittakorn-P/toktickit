import type { TicketStatus, Role } from "@prisma/client";

type Transition = { to: TicketStatus; roles: Role[] };

const STAFF: Role[] = ["IT_STAFF", "ADMINISTRATOR"];

// Sprint 4 status-transition matrix — see docs/lab-04/specification.md §5.1.
// Any (from, to) pair not listed here is rejected, regardless of role.
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

export function canTransition(from: TicketStatus, to: TicketStatus, role: Role): boolean {
  const allowed = TICKET_TRANSITIONS[from] ?? [];
  return allowed.some((t) => t.to === to && t.roles.includes(role));
}

export function allowedTransitions(from: TicketStatus, role: Role): TicketStatus[] {
  const allowed = TICKET_TRANSITIONS[from] ?? [];
  return allowed.filter((t) => t.roles.includes(role)).map((t) => t.to);
}