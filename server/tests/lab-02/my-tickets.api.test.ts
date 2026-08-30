import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
  requesterId = requester!.id;

  // seed a few known tickets to search/filter/sort against
  for (let i = 0; i < 3; i++) {
    await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: `My Tickets test ticket ${i}`,
        description: "Test description",
        requestedPriority: "LOW",
      });
  }
});

describe("GET /api/tickets — search/filter/sort/pagination", () => {
  it("returns only the requesting requester's own tickets", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterId));
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { requesterId: number }) => t.requesterId === requesterId)).toBe(true);
  });

  it("filters by search text against summary", async () => {
    const res = await request(app)
      .get("/api/tickets?search=My Tickets test ticket 1")
      .set("X-Requester-Id", String(requesterId));
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
    expect(
      res.body.tickets.every((t: { summary: string }) =>
        t.summary.includes("My Tickets test ticket 1")
      )
    ).toBe(true);
  });

  it("returns an empty array (not an error) when a filter matches nothing", async () => {
    const res = await request(app)
      .get("/api/tickets?search=NoSuchTicketExistsXYZ")
      .set("X-Requester-Id", String(requesterId));
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
  });

  it("falls back to default page/pageSize on invalid pagination params", async () => {
    const res = await request(app)
      .get("/api/tickets?page=-5&pageSize=9999")
      .set("X-Requester-Id", String(requesterId));
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
  });

  it("includes pagination metadata", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterId));
    expect(res.body.pagination).toHaveProperty("totalItems");
    expect(res.body.pagination).toHaveProperty("totalPages");
  });
});