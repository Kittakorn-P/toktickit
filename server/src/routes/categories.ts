import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const categoriesRouter = express.Router();

// ---------------------------------------------------------------------------
// Issue 4 (Lab 1) / Issue 8 (Lab 2) — GET /api/categories
// Same behavior as the original Lab 1 route, moved into routes/ and now
// filtered to isActive categories only.
// ---------------------------------------------------------------------------
categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Error, Can't reach categories" });
  }
});