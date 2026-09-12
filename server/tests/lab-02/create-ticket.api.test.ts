import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcrypt";

let activeRequesterId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const requester = await prisma.user.findFirst({ where: { isActive: true, role: "REQUESTER" } });
  activeRequesterId = requester!.id;
});

const validPayload = {
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drains fast even when idle.",
  requestedPriority: "MEDIUM",
};

describe("POST /api/tickets — rejects a session deactivated after login", () => {
  it("returns 401 when the logged-in user is deactivated mid-session", async () => {
    const prisma = getPrisma();

    const testEmail = `temp-session-${Date.now()}@example.com`;
    const testPassword = "TestPass123!";
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const testUser = await prisma.user.create({
      data: {
        name: "Temp Session Test",
        email: testEmail,
        isActive: true,
        role: "REQUESTER",
        passwordHash,
        mustChangePassword: false,
      },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });
    const sessionCookie = loginRes.headers["set-cookie"];

    await prisma.user.update({
      where: { id: testUser.id },
      data: { isActive: false },
    });

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", sessionCookie)
      .send(validPayload);

    expect(res.status).toBe(401);

    await prisma.user.delete({ where: { id: testUser.id } });
  });
});

describe("POST /api/tickets", () => {
  it("creates a ticket and returns 201 with a generated ticketNumber", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequesterId))
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6,}$/);
    expect(res.body.requesterId).toBe(activeRequesterId);
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("returns 400 with field errors when Summary is missing", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequesterId))
      .send({ ...validPayload, summary: "" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("summary");
  });

  it("returns 400 when Category is invalid", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequesterId))
      .send({ ...validPayload, categoryId: 999999 });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("categoryId");
  });

  it("returns 401 when X-Requester-Id header is missing", async () => {
    const res = await request(app).post("/api/tickets").send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Requester-Id refers to an inactive requester", async () => {
    const prisma = getPrisma();
    const inactive = await prisma.user.findFirst({ where: { isActive: false, role: "REQUESTER" } });
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(inactive!.id))
      .send(validPayload);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/tickets/:id — ownership (BR-07, BR-19)", () => {
  it("returns 404 for a ticket belonging to a different requester", async () => {
    const prisma = getPrisma();
    const otherRequester = await prisma.user.findFirst({
      where: { isActive: true, id: { not: activeRequesterId } },
    });

    const created = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequesterId))
      .send(validPayload);

    const res = await request(app)
      .get(`/api/tickets/${created.body.id}`)
      .set("X-Requester-Id", String(otherRequester!.id));

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty("summary");
  });

  it("returns 404 (identical shape) for a ticket id that does not exist", async () => {
    const res = await request(app)
      .get("/api/tickets/9999999")
      .set("X-Requester-Id", String(activeRequesterId));
    expect(res.status).toBe(404);
  });
});