import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let requesterId: number;
let requesterCookie: string[];
let staffId: number;
let staffCookie: string[];

beforeAll(async () => {
  const requester = await createTestUser("REQUESTER");
  requesterId = requester.id;
  requesterCookie = await loginTestUser(requester.email, requester.password);

  const staff = await createTestUser("IT_STAFF");
  staffId = staff.id;
  staffCookie = await loginTestUser(staff.email, staff.password);

  for (let i = 0; i < 2; i++) {
    await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
      categoryId: 1, relatedSystemId: 1,
      summary: `Staff queue test ticket ${i}`, description: "For queue tests",
      requestedPriority: "LOW",
    });
  }
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(staffId);
});

describe("GET /api/staff/tickets — authorization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated Requester", async () => {
    const res = await request(app).get("/api/staff/tickets").set("Cookie", requesterCookie);
    expect(res.status).toBe(403);
  });

  it("returns 200 for IT Staff", async () => {
    const res = await request(app).get("/api/staff/tickets").set("Cookie", staffCookie);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/staff/tickets — queue content, search, pagination", () => {
  it("is not scoped to a single requester — sees tickets across all requesters", async () => {
    const res = await request(app).get("/api/staff/tickets").set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    const summaries = res.body.tickets.map((t: { summary: string }) => t.summary);
    expect(summaries.some((s: string) => s.includes("Staff queue test ticket"))).toBe(true);
  });

  it("filters by search text against summary", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?search=Staff queue test ticket 1")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
  });

  it("falls back to default page/pageSize on invalid pagination params", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?page=-5&pageSize=9999")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
  });

  it("filters to unassigned tickets when owner=unassigned", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?owner=unassigned")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { owner: unknown }) => t.owner === null)).toBe(true);
  });
});