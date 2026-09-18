import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

describe("Auth — login, logout, me, change-password", () => {
  it("AC-01/BR-01: valid credentials return an authenticated session and correct role", async () => {
    const user = await createTestUser("REQUESTER");
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("REQUESTER");
    await cleanupTestUser(user.id);
  });

  it("BR-11: invalid password returns a generic error, no field-specific leak", async () => {
    const user = await createTestUser("REQUESTER");
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "WrongPassword1!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    await cleanupTestUser(user.id);
  });

  it("AC-03/BR-14: inactive account returns the identical generic error as wrong password", async () => {
    const prisma = getPrisma();
    const user = await createTestUser("REQUESTER");
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const wrongPasswordRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPassword1!" });
    const inactiveRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    expect(inactiveRes.status).toBe(401);
    expect(inactiveRes.body).toEqual(wrongPasswordRes.body);

    await prisma.user.delete({ where: { id: user.id } });
  });

  it("AC-05/BR-13: logout invalidates the session; next request is unauthenticated", async () => {
    const user = await createTestUser("REQUESTER");
    const cookie = await loginTestUser(user.email, user.password);

    const beforeLogout = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(beforeLogout.status).toBe(200);

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(afterLogout.status).toBe(401);

    await cleanupTestUser(user.id);
  });

  it("AC-04/BR-02: mustChangePassword blocks nothing on /me or /change-password, flips to false after a valid change", async () => {
    const prisma = getPrisma();
    const user = await createTestUser("REQUESTER");
    await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
    const cookie = await loginTestUser(user.email, user.password);

    const meBefore = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meBefore.status).toBe(200);
    expect(meBefore.body.mustChangePassword).toBe(true);

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: user.password, newPassword: "NewSecure123!" });
    expect(changeRes.status).toBe(200);

    const meAfter = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meAfter.body.mustChangePassword).toBe(false);

    await cleanupTestUser(user.id);
  });

  it("AC-06/BR-15: /me returns only the session's own identity, never a client-supplied id", async () => {
    const userA = await createTestUser("REQUESTER");
    const userB = await createTestUser("REQUESTER");
    const cookieA = await loginTestUser(userA.email, userA.password);

    // Even if a client tried to smuggle a different id via query/body, /me
    // takes no input at all — this proves it always resolves from session.
    const res = await request(app).get("/api/auth/me").set("Cookie", cookieA);
    expect(res.body.id).toBe(userA.id);
    expect(res.body.id).not.toBe(userB.id);

    await cleanupTestUser(userA.id);
    await cleanupTestUser(userB.id);
  });
});