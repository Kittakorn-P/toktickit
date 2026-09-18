import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = express.Router();

const SALT_ROUNDS = 10;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const GENERIC_LOGIN_ERROR = { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } };

// ---------------------------------------------------------------------------
// POST /api/auth/login  (BR-01, BR-11, BR-14)
// Same generic error for wrong credentials AND inactive accounts — never
// reveals which case it was.
// ---------------------------------------------------------------------------
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return res.status(401).json(GENERIC_LOGIN_ERROR);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json(GENERIC_LOGIN_ERROR);
    }

    req.session.userId = user.id;

    res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to log in. Please try again." } });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout  (BR-13)
// ---------------------------------------------------------------------------
authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("POST /api/auth/logout failed:", err);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to log out." } });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ success: true });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (BR-15 — never trusts a client-supplied id)
// ---------------------------------------------------------------------------
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    mustChangePassword: req.user!.mustChangePassword,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (BR-02)
// Reachable even while mustChangePassword is true — this IS the escape
// hatch, so it can't be blocked by blockIfPasswordChangeRequired.
// ---------------------------------------------------------------------------
authRouter.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Current and new password are required." } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Not logged in." } });
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return res
        .status(401)
        .json({ error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect." } });
    }

    if (!PASSWORD_RULE.test(newPassword)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "New password must be at least 8 characters and include upper/lowercase, a number, and a special character.",
        },
      });
    }

    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ error: { code: "VALIDATION_ERROR", message: "New password must differ from the current password." } });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/change-password failed:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to change password. Please try again." } });
  }
});