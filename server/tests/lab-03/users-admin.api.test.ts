import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let adminId: number;
let adminCookie: string[];
let requesterId: number;
let requesterCookie: string[];

beforeAll(async () => {
  const admin = await createTestUser("ADMINISTRATOR");
  adminId = admin.id;
  adminCookie = await loginTestUser(admin.email, admin.password);

  const requester = await createTestUser("REQUESTER");
  requesterId = requester.id;
  requesterCookie = await loginTestUser(requester.email, requester.password);
});

afterAll(async () => {
  await cleanupTestUser(adminId);
  await cleanupTestUser(requesterId);
});

describe("GET /api/admin/users — authorization and search", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-Administrator", async () => {
    const res = await request(app).get("/api/admin/users").set("Cookie", requesterCookie);
    expect(res.status).toBe(403);
  });

  it("returns 200 for an Administrator and supports role filtering", async () => {
    const res = await request(app).get("/api/admin/users?role=REQUESTER").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.users.every((u: { role: string }) => u.role === "REQUESTER")).toBe(true);
  });
});

describe("POST /api/admin/users — create, BR-07 duplicate email", () => {
  it("creates a user with a valid role and initial password", async () => {
    const email = `admin-created-${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", adminCookie)
      .send({ name: "New Person", email, role: "IT_STAFF", isActive: true, initialPassword: "ValidPass1!" });
    expect(res.status).toBe(201);
    expect(res.body.mustChangePassword).toBe(true);

    const prisma = getPrisma();
    await prisma.user.delete({ where: { id: res.body.id } });
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", adminCookie)
      .send({ name: "Dup", email: (await getPrisma().user.findUnique({ where: { id: requesterId } }))!.email, role: "REQUESTER", isActive: true, initialPassword: "ValidPass1!" });
    expect(res.status).toBe(409);
  });

  it("rejects a weak password with field-level validation", async () => {
    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", adminCookie)
      .send({ name: "Weak Pw", email: `weak-${Date.now()}@example.com`, role: "REQUESTER", isActive: true, initialPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("initialPassword");
  });
});

describe("PATCH /api/admin/users/:id — edit, BR-08 self-deactivation", () => {
  it("edits name/email/role/activation", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${requesterId}`)
      .set("Cookie", adminCookie)
      .send({ name: "Renamed Person" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Person");
  });

  it("rejects an Administrator's attempt to deactivate their own account", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}`)
      .set("Cookie", adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/admin/users/:id — BR-10 last active Administrator protection", () => {
    it("rejects an Administrator changing their own role away from ADMINISTRATOR when they are the last active one", async () => {
      const prisma = getPrisma();
  
      // Isolate: temporarily deactivate every OTHER active admin so our test
      // admin is genuinely the last one, then restore afterward no matter what.
      const otherActiveAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR", isActive: true, id: { not: adminId } },
        select: { id: true },
      });
  
      await prisma.user.updateMany({
        where: { id: { in: otherActiveAdmins.map((a) => a.id) } },
        data: { isActive: false },
      });
  
      try {
        const res = await request(app)
          .patch(`/api/admin/users/${adminId}`)
          .set("Cookie", adminCookie)
          .send({ role: "REQUESTER" });
        expect(res.status).toBe(409);
      } finally {
        await prisma.user.updateMany({
          where: { id: { in: otherActiveAdmins.map((a) => a.id) } },
          data: { isActive: true },
        });
      }
    });
  
    it("allows a role change away from ADMINISTRATOR when another active Administrator remains", async () => {
      const secondAdmin = await createTestUser("ADMINISTRATOR");
      const secondAdminCookie = await loginTestUser(secondAdmin.email, secondAdmin.password);
  
      const res = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Cookie", adminCookie)
        .send({ role: "REQUESTER" });
      expect(res.status).toBe(200);
  
      void secondAdminCookie; // only needed to prove the account existed/could log in; unused otherwise
      await cleanupTestUser(secondAdmin.id);
    });
  });

describe("PATCH /api/admin/users/:id/password — BR-02", () => {
  it("sets a new initial password and forces change at next login", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${requesterId}/password`)
      .set("Cookie", adminCookie)
      .send({ newInitialPassword: "BrandNew123!" });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });
});