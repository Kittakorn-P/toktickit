import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { formatTicketNumber } from "../utils/ticketNumber.js";
import { canTransition } from "../utils/ticketTransitions.js";

export const ticketsRouter = express.Router();

// Every route in this router needs an authenticated Requester.
ticketsRouter.use(requireAuth, requireRole("REQUESTER"));

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

ticketsRouter.post("/", async (req, res: Response) => {
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;
  const errors: Record<string, string> = {};

  if (!summary || typeof summary !== "string" || !summary.trim()) {
    errors.summary = "Summary is required.";
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    errors.description = "Description is required.";
  }
  if (!categoryId) {
    errors.categoryId = "Category is required.";
  }
  if (!relatedSystemId) {
    errors.relatedSystemId = "Related System is required.";
  }
  if (!requestedPriority || !VALID_PRIORITIES.includes(requestedPriority)) {
    errors.requestedPriority = "A valid Requested Priority is required.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const prisma = getPrisma();

    const [category, relatedSystem] = await Promise.all([
      prisma.category.findUnique({ where: { id: Number(categoryId) } }),
      prisma.relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } }),
    ]);
    if (!category || !category.isActive) {
      return res.status(400).json({ errors: { categoryId: "Invalid or inactive Category." } });
    }
    if (!relatedSystem || !relatedSystem.isActive) {
      return res
        .status(400)
        .json({ errors: { relatedSystemId: "Invalid or inactive Related System." } });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          requesterId: req.user!.id,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
          itPriority: requestedPriority,
          ticketNumber: `PENDING-${Date.now()}-${Math.random()}`,
        },
      });
      return tx.ticket.update({
        where: { id: created.id },
        data: { ticketNumber: formatTicketNumber(created.id) },
      });
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("POST /api/tickets failed:", error);
    res.status(500).json({ error: "Unable to create ticket. Please try again." });
  }
});

const SORT_FIELDS: Record<string, string> = {
  createdAt: "createdAt",
  "-createdAt": "createdAt",
  updatedAt: "updatedAt",
  "-updatedAt": "updatedAt",
  ticketNumber: "ticketNumber",
  "-ticketNumber": "ticketNumber",
};

ticketsRouter.get("/", async (req, res: Response) => {
  try {
    const prisma = getPrisma();

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const categoryFilter = Number(req.query.category);
    const priorityFilter = typeof req.query.requestedPriority === "string"
      ? req.query.requestedPriority
      : undefined;
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;

    const sortParam = typeof req.query.sort === "string" ? req.query.sort : "-createdAt";
    const sortField = SORT_FIELDS[sortParam] ?? "createdAt";
    const sortDirection = sortParam.startsWith("-") ? "desc" : "asc";

    let page = Number(req.query.page);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let pageSize = Number(req.query.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) pageSize = 10;

    const where = {
      requesterId: req.user!.id,
      ...(search && {
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(Number.isInteger(categoryFilter) && { categoryId: categoryFilter }),
      ...(priorityFilter && { requestedPriority: priorityFilter as never }),
      ...(statusFilter && { currentStatus: statusFilter as never }),
    };

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortField]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, relatedSystem: true },
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
    console.error("GET /api/tickets failed:", error);
    res.status(500).json({ error: "Unable to load tickets." });
  }
});

ticketsRouter.get("/:id", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, relatedSystem: true },
    });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    res.status(200).json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/:id failed:", error);
    res.status(500).json({ error: "Unable to load ticket." });
  }
});

// ============================================================================
// LAB 4 ADDITIONS
// ============================================================================

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/actions — read-only Actions Taken for the Requester's
// own ticket (FR-05). Same 404-for-ownership pattern as GET /:id, so a
// Requester probing another user's ticket ID can't tell it exists.
// ---------------------------------------------------------------------------
ticketsRouter.get("/:id/actions", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const actions = await prisma.actionTaken.findMany({
      where: { ticketId: ticket.id },
      orderBy: { actionDateTime: "asc" },
      include: { performedBy: { select: { id: true, name: true } } },
    });
    res.status(200).json({ actions });
  } catch (error) {
    console.error("GET /api/tickets/:id/actions failed:", error);
    res.status(500).json({ error: "Unable to load actions taken." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/status — a Requester may only ever move a ticket
// Resolved -> Reopened (BR-06/BR-08). Every other transition is staff-only
// via /api/staff/tickets/:id/status.
// ---------------------------------------------------------------------------
ticketsRouter.patch("/:id/status", async (req, res: Response) => {
  const { status, updatedAt } = req.body;
  if (status !== "REOPENED") {
    return res.status(403).json({ error: "You don't have access to this transition." });
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (!canTransition(ticket.currentStatus, "REOPENED", "REQUESTER")) {
      return res.status(422).json({ error: `Cannot move from ${ticket.currentStatus} to REOPENED.` });
    }
    if (updatedAt && new Date(updatedAt).getTime() !== ticket.updatedAt.getTime()) {
      return res.status(409).json({ error: "This ticket was updated elsewhere.", current: ticket });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "REOPENED" },
    });
    res.status(200).json({
      id: updated.id,
      currentStatus: updated.currentStatus,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/tickets/:id/status failed:", error);
    res.status(500).json({ error: "Unable to update status." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/looks-resolved — advisory flag only (BR-07/FR-07).
// Never changes currentStatus by itself.
// ---------------------------------------------------------------------------
ticketsRouter.patch("/:id/looks-resolved", async (req, res: Response) => {
  const { looksResolved } = req.body;
  if (typeof looksResolved !== "boolean") {
    return res.status(400).json({ error: "looksResolved must be a boolean." });
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { looksResolvedByRequester: looksResolved },
    });
    res.status(200).json({
      id: updated.id,
      looksResolvedByRequester: updated.looksResolvedByRequester,
    });
  } catch (error) {
    console.error("PATCH /api/tickets/:id/looks-resolved failed:", error);
    res.status(500).json({ error: "Unable to update ticket." });
  }
});