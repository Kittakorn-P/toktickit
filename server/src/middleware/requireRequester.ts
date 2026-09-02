import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

// Extends Express's Request type so downstream routes can read req.requester
// without re-validating the header themselves.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requester?: { id: number; name: string; email: string };
    }
  }
}

// ---------------------------------------------------------------------------
// Issue 7 — Development Requester context middleware
// Reads X-Requester-Id from the request header, validates it against the
// active RequesterUser list, and attaches the result to req.requester.
// Responds 401 if the header is missing, malformed, or refers to a
// nonexistent/inactive Requester. This is a TESTING mechanism only — not
// real authentication (BR-03).
// ---------------------------------------------------------------------------
export async function requireRequester(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.header("X-Requester-Id");
  const requesterId = header ? Number(header) : NaN;

  if (!header || Number.isNaN(requesterId)) {
    return res.status(401).json({ error: "Missing or invalid X-Requester-Id header" });
  }

  try {
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(401).json({ error: "Requester not found or inactive" });
    }

    req.requester = { id: requester.id, name: requester.name, email: requester.email };
    next();
  } catch (error) {
    res.status(500).json({ error: "Error validating requester" });
  }
}