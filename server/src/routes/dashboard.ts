import express, { Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

export const dashboardRouter = express.Router();

dashboardRouter.use(requireAuth);

const RECENT_LIMIT = 5;

// ---------------------------------------------------------------------------
// GET /api/dashboard/requester — ui-spec.md §3
// Always scoped to req.user!.id server-side; there is no requesterId
// parameter the client could override (AUTH-06/AC-02).
// ---------------------------------------------------------------------------
dashboardRouter.get("/requester", requireRole("REQUESTER"), async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesterId = req.user!.id;

    const [myOpen, inProgress, resolved, closed, recent] = await Promise.all([
      prisma.ticket.count({ where: { requesterId, currentStatus: { in: ["NEW", "OPEN", "REOPENED"] } } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: { in: ["IN_PROGRESS", "WAITING_FOR_REQUESTER"] } } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: "RESOLVED" } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: "CLOSED" } }),
      prisma.ticket.findMany({
        where: { requesterId },
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
      }),
    ]);

    res.status(200).json({
      metrics: { myOpen, inProgress, resolved, closed },
      recentTickets: recent.map((t) => ({
        id: t.id, code: t.ticketNumber, title: t.summary, status: t.currentStatus, updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/requester failed:", error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/staff — ui-spec.md §2. Reused as-is for Administrator
// (handout §6: "Administrator dashboard: may reuse the IT Staff dashboard").
// "Recent Tickets" = owned by the caller OR has an Action Taken performed by
// the caller, matching ui-spec.md §2's "owned or acted-on" definition.
// ---------------------------------------------------------------------------
dashboardRouter.get("/staff", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const userId = req.user!.id;

    const [newCount, open, inProgress, waitingForRequester, myAssigned, recent] = await Promise.all([
      prisma.ticket.count({ where: { currentStatus: "NEW" } }),
      prisma.ticket.count({ where: { currentStatus: "OPEN" } }),
      prisma.ticket.count({ where: { currentStatus: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({
        where: { ownerId: userId, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } },
      }),
      prisma.ticket.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { actionsTaken: { some: { performedById: userId } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: RECENT_LIMIT,
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
      }),
    ]);

    res.status(200).json({
      metrics: { new: newCount, open, inProgress, waitingForRequester, myAssigned },
      recentTickets: recent.map((t) => ({
        id: t.id, code: t.ticketNumber, title: t.summary, status: t.currentStatus, updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/staff failed:", error);
    res.status(500).json({ error: "Unable to load dashboard." });
  }
});