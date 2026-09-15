import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const commentsRouter = express.Router();

commentsRouter.use(requireAuth);

// Shared access check: Requester must own the ticket; IT Staff/Administrator
// may access any ticket. Returns the ticket or sends a response and returns
// null (caller must check for null and stop).
async function loadTicketForCommentAccess(req: express.Request, res: Response) {
  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({ where: { id: Number(req.params.ticketId) } });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found." });
    return null;
  }
  if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
    // BR-07/BR-19 pattern: not-owned looks identical to not-found.
    res.status(404).json({ error: "Ticket not found." });
    return null;
  }
  return ticket;
}

// ---------------------------------------------------------------------------
// POST /api/tickets/:ticketId/comments — BR-19, BR-22
// ---------------------------------------------------------------------------
commentsRouter.post("/:ticketId/comments", async (req, res: Response) => {
  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required." });
  }

  try {
    const ticket = await loadTicketForCommentAccess(req, res);
    if (!ticket) return;

    const prisma = getPrisma();
    const comment = await prisma.comment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("POST /api/tickets/:ticketId/comments failed:", error);
    res.status(500).json({ error: "Unable to post comment." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:ticketId/comments
// ---------------------------------------------------------------------------
commentsRouter.get("/:ticketId/comments", async (req, res: Response) => {
  try {
    const ticket = await loadTicketForCommentAccess(req, res);
    if (!ticket) return;

    const prisma = getPrisma();
    const comments = await prisma.comment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(200).json({ comments });
  } catch (error) {
    console.error("GET /api/tickets/:ticketId/comments failed:", error);
    res.status(500).json({ error: "Unable to load comments." });
  }
});