import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const TEST_PASSWORD = "TestPass123!";

export async function createTestUser(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" = "REQUESTER") {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const email = `test-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const user = await prisma.user.create({
    data: { name: `Test ${role}`, email, isActive: true, role, passwordHash, mustChangePassword: false },
  });
  return { id: user.id, email, password: TEST_PASSWORD };
}

export async function loginTestUser(email: string, password: string = TEST_PASSWORD): Promise<string[]> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookies = res.headers["set-cookie"];
  if (!cookies) {
    throw new Error(`Login failed for ${email} — no session cookie returned.`);
  }
  return Array.isArray(cookies) ? cookies : [cookies];
}

// Deletes a test user and everything referencing them, in FK-safe order.
export async function cleanupTestUser(userId: number) {
  const prisma = getPrisma();
  const tickets = await prisma.ticket.findMany({ where: { requesterId: userId }, select: { id: true } });
  const ticketIds = tickets.map((t) => t.id);

  if (ticketIds.length > 0) {
    // LAB 4 — ActionTaken rows must go before their Ticket, same reason
    // Attachment/Comment/Note already had to.
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.comment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.note.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  }
  // LAB 4 — a staff test user may be the performer on actions belonging to
  // tickets requested by someone else, so this isn't covered by the block above.
  await prisma.actionTaken.deleteMany({ where: { performedById: userId } });
  await prisma.comment.deleteMany({ where: { authorId: userId } });
  await prisma.note.deleteMany({ where: { authorId: userId } });
  await prisma.ticket.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
  await prisma.user.delete({ where: { id: userId } });
}