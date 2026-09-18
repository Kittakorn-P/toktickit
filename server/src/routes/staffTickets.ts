import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

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
// PATCH /api/staff/tickets/:id/status — BR-21 (role-gated, no transition
// matrix restriction beyond that)
// ---------------------------------------------------------------------------
staffTicketsRouter.patch("/:id/status", async (req, res: Response) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "A valid status is required." });
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: status },
    });
    res.status(200).json({ id: updated.id, currentStatus: updated.currentStatus });
  } catch (error) {
    console.error("PATCH /api/staff/tickets/:id/status failed:", error);
    res.status(500).json({ error: "Unable to update status." });
  }
});