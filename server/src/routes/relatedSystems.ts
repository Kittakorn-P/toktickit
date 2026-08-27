import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const relatedSystemsRouter = express.Router();

// ---------------------------------------------------------------------------
// Issue 8 — GET /api/related-systems
// Returns active Related Systems, same pattern as existing /api/categories.
// ---------------------------------------------------------------------------
relatedSystemsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (error) {
    res.status(500).json({ error: "Error, can't reach related systems" });
  }
});