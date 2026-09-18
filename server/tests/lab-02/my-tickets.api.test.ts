import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let requesterId: number;
let cookie: string[];

beforeAll(async () => {
  const user = await createTestUser("REQUESTER");
  requesterId = user.id;
  cookie = await loginTestUser(user.email, user.password);

  for (let i = 0; i < 3; i++) {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        categoryId: 1, relatedSystemId: 1,
        summary: `My Tickets test ticket ${i}`, description: "Test description",
        requestedPriority: "LOW",
      });
  }
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
});

describe("GET /api/tickets — search/filter/sort/pagination", () => {
  it("returns only the requesting requester's own tickets", async () => {
    const res = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { requesterId: number }) => t.requesterId === requesterId)).toBe(true);
  });

  it("filters by search text against summary", async () => {
    const res = await request(app).get("/api/tickets?search=My Tickets test ticket 1").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
    expect(res.body.tickets.every((t: { summary: string }) => t.summary.includes("My Tickets test ticket 1"))).toBe(true);
  });

  it("returns an empty array (not an error) when a filter matches nothing", async () => {
    const res = await request(app).get("/api/tickets?search=NoSuchTicketExistsXYZ").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
  });

  it("falls back to default page/pageSize on invalid pagination params", async () => {
    const res = await request(app).get("/api/tickets?page=-5&pageSize=9999").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
  });

  it("includes pagination metadata", async () => {
    const res = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(res.body.pagination).toHaveProperty("totalItems");
    expect(res.body.pagination).toHaveProperty("totalPages");
  });
});