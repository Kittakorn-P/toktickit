import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { canTransition } from "../utils/ticketTransitions.js";

export const staffTicketsRouter = express.Router();

staffTicketsRouter.use(requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"));

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const VALID_STATUSES = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
  "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
];

const SORT_FIELDS: Record<string, string> = {
  createdAt: "createdAt",
  "-createdAt": "createdAt",
  updatedAt: "updatedAt",
  "-updatedAt": "updatedAt",
  itPriority: "itPriority",
  "-itPriority": "itPriority",
};

// ---------------------------------------------------------------------------
// GET /api/staff/tickets — the queue. Search/filter/sort/pagination.
// Invalid/out-of-range params fall back to defaults (same BR-10 pattern
// as the Requester ticket list).
// ---------------------------------------------------------------------------
staffTicketsRouter.get("/", async (req, res: Response) => {
  try {
    const prisma = getPrisma();

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const categoryFilter = Number(req.query.category);
    const itPriorityFilter = typeof req.query.itPriority === "string" ? req.query.itPriority : undefined;
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
    const ownerParam = typeof req.query.owner === "string" ? req.query.owner : undefined;

    const sortParam = typeof req.query.sort === "string" ? req.query.sort : "-createdAt";
    const sortField = SORT_FIELDS[sortParam] ?? "createdAt";
    const sortDirection = sortParam.startsWith("-") ? "desc" : "asc";

    let page = Number(req.query.page);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let pageSize = Number(req.query.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) pageSize = 10;

    let ownerClause = {};
    if (ownerParam === "unassigned") {
      ownerClause = { ownerId: null };
    } else if (ownerParam && Number.isInteger(Number(ownerParam))) {
      ownerClause = { ownerId: Number(ownerParam) };
    }

    const where = {
      ...(search && {
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(Number.isInteger(categoryFilter) && { categoryId: categoryFilter }),
      ...(itPriorityFilter && VALID_PRIORITIES.includes(itPriorityFilter) && { itPriority: itPriorityFilter as never }),
      ...(statusFilter && VALID_STATUSES.includes(statusFilter) && { currentStatus: statusFilter as never }),
      ...ownerClause,
    };

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortField]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, owner: { select: { id: true, name: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.status(200).json({
      tickets,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    });
  } catch (error) {
    console.error("GET /api/staff/tickets failed:", error);
    res.status(500).json({ error: "Unable to load queue." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id — full detail, no ownership restriction beyond role.
// ---------------------------------------------------------------------------
staffTicketsRouter.get("/:id", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    res.status(200).json(ticket);
  } catch (error) {
    console.error("GET /api/staff/tickets/:id failed:", error);
    res.status(500).json({ error: "Unable to load ticket." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/claim — BR-16, BR-17
// ownerId must belong to an active IT Staff or Administrator user.
// ---------------------------------------------------------------------------
staffTicketsRouter.patch("/:id/claim", async (req, res: Response) => {
  const { ownerId } = req.body;
  try {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const candidate = await prisma.user.findUnique({ where: { id: Number(ownerId) } });
    if (
      !candidate ||
      !candidate.isActive ||
      !["IT_STAFF", "ADMINISTRATOR"].includes(candidate.role)
    ) {
      return res.status(400).json({ error: "ownerId must be an active IT Staff or Administrator user." });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { ownerId: candidate.id },
      include: { owner: { select: { id: true, name: true } } },
    });

    res.status(200).json({ id: updated.id, owner: updated.owner });
  } catch (error) {
    console.error("PATCH /api/staff/tickets/:id/claim failed:", error);
    res.status(500).json({ error: "Unable to update ticket owner." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/priority — BR-18
// ---------------------------------------------------------------------------
staffTicketsRouter.patch("/:id/priority", async (req, res: Response) => {
  const { itPriority } = req.body;
  if (!VALID_PRIORITIES.includes(itPriority)) {
    return res.status(400).json({ error: "A valid IT Priority is required." });
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { itPriority },
    });
    res.status(200).json({ id: updated.id, itPriority: updated.itPriority });
  } catch (error) {
    console.error("PATCH /api/staff/tickets/:id/priority failed:", error);
    res.status(500).json({ error: "Unable to update priority." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/status — enforces the full status-transition
// matrix (BR-08, specification.md §5.1) plus optimistic concurrency (BR-09).
//
// NOTE (known follow-up, not fixed in this PR): like the pre-fix Actions
// Taken PATCH, this still does a read-then-write updatedAt check rather than
// a single atomic query, and skips the check entirely if updatedAt isn't
// sent. Same class of bug the reviewer caught on the actions endpoint —
// worth a follow-up pass, called out separately rather than folded in here
// to keep this PR's diff focused on what was actually reviewed.
// ---------------------------------------------------------------------------
staffTicketsRouter.patch("/:id/status", async (req, res: Response) => {
  const { status, updatedAt } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "A valid status is required." });
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (!canTransition(ticket.currentStatus, status, req.user!.role)) {
      return res.status(422).json({ error: `Cannot move from ${ticket.currentStatus} to ${status}.` });
    }
    if (updatedAt && new Date(updatedAt).getTime() !== ticket.updatedAt.getTime()) {
      return res.status(409).json({ error: "This ticket was updated elsewhere.", current: ticket });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: status },
    });
    res.status(200).json({
      id: updated.id,
      currentStatus: updated.currentStatus,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/staff/tickets/:id/status failed:", error);
    res.status(500).json({ error: "Unable to update status." });
  }
});

// ============================================================================
// LAB 4 — Actions Taken
// ============================================================================

const TERMINAL_TICKET_STATUSES = ["CLOSED", "CANCELLED"];

const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_RESULT_LENGTH = 4000;
const MAX_FOLLOW_UP_NOTE_LENGTH = 2000;
const MAX_ATTACHMENT_NOTES_LENGTH = 1000;

// How long a duplicate create request from the same actor, on the same
// ticket, with identical content, is treated as a double-click/retry rather
// than a genuine second action. This is a backstop — the real fix (disabling
// the submit button while the request is in flight) belongs in the UI.
const DUPLICATE_SUBMIT_WINDOW_MS = 5000;

// Validates type + length for whichever Actions Taken fields are present.
// `partial: true` (PATCH) only validates fields that were actually sent;
// `partial: false` (POST) requires description/result to be present.
function validateActionFields(
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const { description, result, followUpNote, attachmentNotes } = body;

  if (!partial || description !== undefined) {
    if (!description || typeof description !== "string" || !description.trim()) {
      errors.description = "Description is required.";
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
    }
  }

  if (!partial || result !== undefined) {
    if (!result || typeof result !== "string" || !result.trim()) {
      errors.result = "Result is required.";
    } else if (result.length > MAX_RESULT_LENGTH) {
      errors.result = `Result must be ${MAX_RESULT_LENGTH} characters or fewer.`;
    }
  }

  if (followUpNote !== undefined && followUpNote !== null) {
    if (typeof followUpNote !== "string") {
      errors.followUpNote = "Follow-up note must be text.";
    } else if (followUpNote.length > MAX_FOLLOW_UP_NOTE_LENGTH) {
      errors.followUpNote = `Follow-up note must be ${MAX_FOLLOW_UP_NOTE_LENGTH} characters or fewer.`;
    }
  }

  if (attachmentNotes !== undefined && attachmentNotes !== null) {
    if (typeof attachmentNotes !== "string") {
      errors.attachmentNotes = "Attachment notes must be text.";
    } else if (attachmentNotes.length > MAX_ATTACHMENT_NOTES_LENGTH) {
      errors.attachmentNotes = `Attachment notes must be ${MAX_ATTACHMENT_NOTES_LENGTH} characters or fewer.`;
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id/actions — any IT Staff/Admin (BR-02: not just
// the Ticket Owner may view/act, since different staff can take action).
// ---------------------------------------------------------------------------
staffTicketsRouter.get("/:id/actions", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const actions = await prisma.actionTaken.findMany({
      where: { ticketId: ticket.id },
      orderBy: { actionDateTime: "asc" },
      include: { performedBy: { select: { id: true, name: true } } },
    });
    res.status(200).json({ actions });
  } catch (error) {
    console.error("GET /api/staff/tickets/:id/actions failed:", error);
    res.status(500).json({ error: "Unable to load actions taken." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/staff/tickets/:id/actions — FR-01, FR-03, BR-03, BR-04.
// performedBy/actionDateTime are always server-set. Rejected on a Closed or
// Cancelled ticket (review fix). A duplicate submission within
// DUPLICATE_SUBMIT_WINDOW_MS returns the existing record instead of
// creating a second one (review fix — backstop for double-click).
// ---------------------------------------------------------------------------
staffTicketsRouter.post("/:id/actions", async (req, res: Response) => {
  const { description, result, followUpRequired, followUpNote, attachmentNotes } = req.body;
  const errors = validateActionFields(req.body, { partial: false });

  const followUp = Boolean(followUpRequired);
  if (followUp && (!followUpNote || typeof followUpNote !== "string" || !followUpNote.trim())) {
    errors.followUpNote = "Follow-up note is required when follow-up is needed.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (TERMINAL_TICKET_STATUSES.includes(ticket.currentStatus)) {
      return res.status(422).json({
        error: `Cannot add an action to a ${ticket.currentStatus} ticket.`,
      });
    }

    const recentDuplicate = await prisma.actionTaken.findFirst({
      where: {
        ticketId: ticket.id,
        performedById: req.user!.id,
        description: description.trim(),
        result: result.trim(),
        createdAt: { gte: new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      include: { performedBy: { select: { id: true, name: true } } },
    });
    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
    }

    const action = await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        description: description.trim(),
        result: result.trim(),
        performedById: req.user!.id,
        followUpRequired: followUp,
        followUpNote: followUp ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes?.trim() || null,
      },
      include: { performedBy: { select: { id: true, name: true } } },
    });

    res.status(201).json(action);
  } catch (error) {
    console.error("POST /api/staff/tickets/:id/actions failed:", error);
    res.status(500).json({ error: "Unable to create action." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/actions/:actionId — BR-05, BR-09.
//
// Review fixes applied here:
//  - any IT Staff/Admin may edit (handout: "IT Staff and Administrators can
//    create and update Actions Taken" — not restricted to the author).
//  - description/result/followUpNote/attachmentNotes are type- and
//    length-checked (422), instead of crashing into a 500 on a non-string.
//  - updatedAt is now required, and the stale check is done atomically via
//    updateMany's WHERE clause (id + updatedAt together), so there's no
//    read-then-write gap where two concurrent edits could both pass the
//    check and one silently clobber the other.
//  - rejected on a Closed or Cancelled ticket, same as create.
// ---------------------------------------------------------------------------
staffTicketsRouter.patch("/:id/actions/:actionId", async (req, res: Response) => {
  const { description, result, followUpRequired, followUpNote, attachmentNotes, updatedAt } = req.body;

  if (!updatedAt) {
    return res.status(400).json({ error: "updatedAt is required to edit an action." });
  }

  const errors = validateActionFields(req.body, { partial: true });
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  try {
    const prisma = getPrisma();
    const action = await prisma.actionTaken.findUnique({
      where: { id: Number(req.params.actionId) },
      include: { ticket: { select: { currentStatus: true } } },
    });
    if (!action || action.ticketId !== Number(req.params.id)) {
      return res.status(404).json({ error: "Action not found." });
    }
    if (TERMINAL_TICKET_STATUSES.includes(action.ticket.currentStatus)) {
      return res.status(422).json({
        error: `Cannot edit an action on a ${action.ticket.currentStatus} ticket.`,
      });
    }

    const followUp = followUpRequired === undefined ? action.followUpRequired : Boolean(followUpRequired);
    const resolvedNote = followUpNote !== undefined ? followUpNote : action.followUpNote;
    if (followUp && !(resolvedNote && resolvedNote.trim())) {
      return res.status(422).json({
        errors: { followUpNote: "Follow-up note is required when follow-up is needed." },
      });
    }

    const updateResult = await prisma.actionTaken.updateMany({
      where: { id: action.id, updatedAt: new Date(updatedAt) },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(result !== undefined && { result: result.trim() }),
        followUpRequired: followUp,
        followUpNote: followUp ? resolvedNote!.trim() : null,
        ...(attachmentNotes !== undefined && { attachmentNotes: attachmentNotes?.trim() || null }),
      },
    });

    if (updateResult.count === 0) {
      const current = await prisma.actionTaken.findUnique({
        where: { id: action.id },
        include: { performedBy: { select: { id: true, name: true } } },
      });
      return res.status(409).json({ error: "This action was modified elsewhere.", current });
    }

    const updated = await prisma.actionTaken.findUnique({
      where: { id: action.id },
      include: { performedBy: { select: { id: true, name: true } } },
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error("PATCH /api/staff/tickets/:id/actions/:actionId failed:", error);
    res.status(500).json({ error: "Unable to update action." });
  }
});