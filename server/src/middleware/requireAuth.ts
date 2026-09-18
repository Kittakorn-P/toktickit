import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
        mustChangePassword: boolean;
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Session-based auth. Re-checks the user in the DB on every request (not
// just trusting session data) so a mid-session deactivation takes effect
// immediately, same principle as BR-06 for the old Requester header.
// ---------------------------------------------------------------------------
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Not logged in." } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Not logged in." } });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (error) {
    console.error("requireAuth failed:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to verify session." } });
  }
}

// Role gate — use after requireAuth. e.g. requireRole("IT_STAFF", "ADMINISTRATOR")
export function requireRole(...roles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: { code: "FORBIDDEN", message: "You don't have access to this resource." } });
    }
    next();
  };
}

// BR-02 enforcement — blocks any route behind it until the password change
// is done. Deliberately NOT applied to the auth router itself, since
// /api/auth/me and /api/auth/change-password must remain reachable even
// while mustChangePassword is true.
export function blockIfPasswordChangeRequired(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res
      .status(403)
      .json({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "You must change your password before continuing." } });
  }
  next();
}