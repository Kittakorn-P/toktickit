import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const requestersRouter = express.Router();

// ---------------------------------------------------------------------------
// Issue 7 — GET /api/requesters
// Returns only active Development Requesters, for the Selector screen.
// Inactive Requesters must never appear here (BR-16 / spec Section 4.5).
// ---------------------------------------------------------------------------
requestersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: "Error, can't reach requesters" });
  }
});