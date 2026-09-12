import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import { getPrisma } from "./prisma.js";
import { categoriesRouter } from "./routes/categories.js";
import { relatedSystemsRouter } from "./routes/relatedSystems.js";
import { requestersRouter } from "./routes/requesters.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { authRouter } from "./routes/auth.js";
void getPrisma;

export const app = express();

// CHANGED: credentials + explicit origin required for session cookies to work.
// The old cors() wildcard default is incompatible with credentialed requests.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// NEW — session setup. In-memory store, fine for local dev per our earlier
// decision; add SESSION_SECRET to server/.env for anything beyond your own
// machine.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true only once served over HTTPS — not applicable here
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/requesters", requestersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api", attachmentsRouter);

export default app;