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
    res.status(500).json({ error: "Unable to create ticket. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// Issue 18 (My Tickets) will extend this with search/filter/sort/pagination.
// Minimal owned-list version for now so the route exists and is testable.
// ---------------------------------------------------------------------------
ticketsRouter.get("/", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      where: { requesterId: req.requester!.id },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ tickets });
  } catch (error) {
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
    res.status(500).json({ error: "Unable to load ticket." });
  }
});