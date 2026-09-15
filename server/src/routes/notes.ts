import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

export const notesRouter = express.Router();

notesRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// POST /api/tickets/:ticketId/notes — BR-04, BR-20, BR-22
// requireRole moved here (not blanket router.use) so a plain request that
// doesn't match any note route — e.g. GET /api/tickets from a Requester —
// isn't wrongly intercepted and rejected by this router's role check.
// ---------------------------------------------------------------------------
notesRouter.post("/:ticketId/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res: Response) => {
  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Note content is required." });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.ticketId) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const note = await prisma.note.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("POST /api/tickets/:ticketId/notes failed:", error);
    res.status(500).json({ error: "Unable to post note." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:ticketId/notes
// ---------------------------------------------------------------------------
notesRouter.get("/:ticketId/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.ticketId) } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const notes = await prisma.note.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    });

    res.status(200).json({ notes });
  } catch (error) {
    console.error("GET /api/tickets/:ticketId/notes failed:", error);
    res.status(500).json({ error: "Unable to load notes." });
  }
});