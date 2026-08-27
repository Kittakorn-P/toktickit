import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Issue 7 — GET /api/requesters
// Asserts only active Development Requesters are returned (BR-16), and that
// the inactive seeded Requester is excluded.
describe("GET /api/requesters", () => {
  it("returns only active requesters, excluding the inactive seeded one", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);

    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toContain("Jennifer Anderson");
    expect(names).not.toContain("Inactive Ida");

    // Every returned requester must have id, name, and email.
    for (const r of res.body) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("email");
    }
  });
});