import express, { Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole("ADMINISTRATOR"));

const VALID_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const SALT_ROUNDS = 10;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ---------------------------------------------------------------------------
// GET /api/admin/users — search by name/email, optional role filter.
// No pagination/multi-sort per handout §8.5 — full matching list returned.
// ---------------------------------------------------------------------------
adminRouter.get("/users", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const roleFilter = typeof req.query.role === "string" ? req.query.role : undefined;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(roleFilter && VALID_ROLES.includes(roleFilter) && { role: roleFilter as never }),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json({ users });
  } catch (error) {
    console.error("GET /api/admin/users failed:", error);
    res.status(500).json({ error: "Unable to load users." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users — create with one role + initial password (BR-06, BR-07)
// ---------------------------------------------------------------------------
adminRouter.post("/users", async (req, res: Response) => {
  const { name, email, role, isActive, initialPassword } = req.body;
  const errors: Record<string, string> = {};

  if (!name || typeof name !== "string" || !name.trim()) errors.name = "Name is required.";
  if (!email || typeof email !== "string" || !email.trim()) errors.email = "Email is required.";
  if (!role || !VALID_ROLES.includes(role)) errors.role = "A valid role is required.";
  if (!initialPassword || typeof initialPassword !== "string" || !PASSWORD_RULE.test(initialPassword)) {
    errors.initialPassword = "Password must be at least 8 characters and include upper/lowercase, a number, and a special character.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const prisma = getPrisma();

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return res.status(409).json({ error: "This email is already in use." });
    }

    const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        role,
        isActive: isActive !== false,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("POST /api/admin/users failed:", error);
    res.status(500).json({ error: "Unable to create user." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id — edit name/email/role/activation
// BR-07 (dup email), BR-08 (no self-deactivation), BR-10 (no last-admin removal)
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id", async (req, res: Response) => {
  const targetId = Number(req.params.id);
  const { name, email, role, isActive } = req.body;

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return res.status(404).json({ error: "User not found." });
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "A valid role is required." });
    }

    if (email !== undefined && email.trim() !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existing) {
        return res.status(409).json({ error: "This email is already in use." });
      }
    }

    // BR-08: cannot deactivate own account
    if (isActive === false && targetId === req.user!.id) {
      return res.status(409).json({ error: "You cannot deactivate your own account." });
    }

    // BR-10: cannot remove the last active Administrator, via role change OR deactivation
    const wouldLoseAdminStatus =
      target.role === "ADMINISTRATOR" &&
      target.isActive &&
      ((role !== undefined && role !== "ADMINISTRATOR") || isActive === false);

    if (wouldLoseAdminStatus) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      if (activeAdminCount <= 1) {
        return res.status(409).json({ error: "Cannot remove the last active Administrator." });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/users/:id failed:", error);
    res.status(500).json({ error: "Unable to update user." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/password — set new initial password (BR-02)
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id/password", async (req, res: Response) => {
  const targetId = Number(req.params.id);
  const { newInitialPassword } = req.body;

  if (!newInitialPassword || !PASSWORD_RULE.test(newInitialPassword)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters and include upper/lowercase, a number, and a special character.",
    });
  }

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordHash = await bcrypt.hash(newInitialPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash, mustChangePassword: true },
    });

    res.status(200).json({ id: targetId, mustChangePassword: true });
  } catch (error) {
    console.error("PATCH /api/admin/users/:id/password failed:", error);
    res.status(500).json({ error: "Unable to set new password." });
  }
});