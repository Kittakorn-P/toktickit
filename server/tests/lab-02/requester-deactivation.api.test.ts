import { describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// BR-06: If a logged-in user is deactivated mid-session, the very next
// request using that session must fail safely (401), not just users who
// were already inactive at login time.
describe("BR-06 — User deactivated mid-session", () => {
  it("rejects a request from a user who was active moments ago but is now deactivated", async () => {
    const prisma = getPrisma();
    const passwordHash = await bcrypt.hash("TestPass123!", 10);

    const testUser = await prisma.user.create({
      data: {
        name: "Temp Session Test",
        email: `temp-session-${Date.now()}@example.com`,
        isActive: true,
        role: "REQUESTER",
        passwordHash,
        mustChangePassword: false,
      },
    });

    // Log in to get a real session cookie.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "TestPass123!" });
    expect(loginRes.status).toBe(200);
    const sessionCookie = loginRes.headers["set-cookie"];

    // Confirm they can act while active.
    const beforeRes = await request(app).get("/api/tickets").set("Cookie", sessionCookie);
    expect(beforeRes.status).toBe(200);

    // Deactivate mid-session (simulating an admin action elsewhere).
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isActive: false },
    });

    // The same session must now be rejected on the very next request.
    const afterRes = await request(app).get("/api/tickets").set("Cookie", sessionCookie);
    expect(afterRes.status).toBe(401);

    // Cleanup — don't leave orphaned test users behind.
    await prisma.user.delete({ where: { id: testUser.id } });
  });
});