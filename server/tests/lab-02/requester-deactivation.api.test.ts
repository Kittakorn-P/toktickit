import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// BR-06: If the currently selected Requester is deactivated mid-session,
// the very next request using that Requester's id must fail safely (401),
// not just Requesters that were already inactive at session start.
describe("BR-06 — Requester deactivated mid-session", () => {
  it("rejects a request from a Requester who was active moments ago but is now deactivated", async () => {
    const prisma = getPrisma();

    // Create a fresh Requester who starts active, so we control the transition.
    const testRequester = await prisma.requesterUser.create({
      data: {
        name: "Temp Session Test",
        email: `temp-session-${Date.now()}@example.com`,
        isActive: true,
      },
    });

    // Confirm they can act while active.
    const beforeRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(testRequester.id));
    expect(beforeRes.status).toBe(200);

    // Deactivate mid-session (simulating an admin/instructor action elsewhere).
    await prisma.requesterUser.update({
      where: { id: testRequester.id },
      data: { isActive: false },
    });

    // The same Requester ID must now be rejected on the very next request.
    const afterRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(testRequester.id));
    expect(afterRes.status).toBe(401);
  });
});