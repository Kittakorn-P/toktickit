import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { categoriesRouter } from "./routes/categories.js";
import { relatedSystemsRouter } from "./routes/relatedSystems.js";
import { requestersRouter } from "./routes/requesters.js";
import { ticketsRouter } from "./routes/tickets.js";
void getPrisma;

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check (unchanged from Lab 1)
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 2 — mounted route files (Issues 7, 8)
// ---------------------------------------------------------------------------
app.use("/api/categories", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/requesters", requestersRouter);
app.use("/api/tickets", ticketsRouter);

export default app;