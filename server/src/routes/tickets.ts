import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireRequester } from "../middleware/requireRequester.js";
import { formatTicketNumber } from "../utils/ticketNumber.js";

export const ticketsRouter = express.Router();

// Every route in this router needs to know which Requester is asking.
ticketsRouter.use(requireRequester);

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

// ---------------------------------------------------------------------------
// Issue 16 — POST /api/tickets
// Creates a Ticket owned by the current Requester. Validates required
// fields and that Category/RelatedSystem references exist and are active.
// ---------------------------------------------------------------------------
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
          requesterId: req.requester!.id,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
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

// ---------------------------------------------------------------------------
// Issue 18 — GET /api/tickets
// Search, filter, sort, and paginate the current Requester's own Tickets.
// Invalid/out-of-range params fall back to defaults rather than erroring
// (BR-10). Ownership filtering is always server-side (BR-08).
// ---------------------------------------------------------------------------
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
      requesterId: req.requester!.id,
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

// ---------------------------------------------------------------------------
// Issue 19 (Ticket Detail) will need this; included now since ownership
// logic is identical to what we just built and tested here.
// BR-07 / BR-19: not-owned and not-found are indistinguishable (404).
// ---------------------------------------------------------------------------
ticketsRouter.get("/:id", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!ticket || ticket.requesterId !== req.requester!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    res.status(200).json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/:id failed:", error);
    res.status(500).json({ error: "Unable to load ticket." });
  }
});