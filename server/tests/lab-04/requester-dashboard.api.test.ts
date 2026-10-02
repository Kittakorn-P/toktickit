import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let requesterId: number;
let requesterCookie: string[];
let otherRequesterId: number;
let otherRequesterCookie: string[];
let staffId: number;
let staffCookie: string[];

async function createTicket(cookie: string[], summary: string) {
  const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
    categoryId: 1, relatedSystemId: 1, summary, description: "Dashboard test ticket",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
}

async function setStatus(ticketId: number, status: string, cookie: string[]) {
  await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", cookie).send({ status });
}

beforeAll(async () => {
  const requester = await createTestUser("REQUESTER");
  requesterId = requester.id;
  requesterCookie = await loginTestUser(requester.email, requester.password);

  const otherRequester = await createTestUser("REQUESTER");
  otherRequesterId = otherRequester.id;
  otherRequesterCookie = await loginTestUser(otherRequester.email, otherRequester.password);

  const staff = await createTestUser("IT_STAFF");
  staffId = staff.id;
  staffCookie = await loginTestUser(staff.email, staff.password);
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(otherRequesterId);
  await cleanupTestUser(staffId);
});

describe("GET /api/dashboard/requester — authorization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/dashboard/requester");
    expect(res.status).toBe(401);
  });

  it("returns 403 for IT Staff", async () => {
    const res = await request(app).get("/api/dashboard/requester").set("Cookie", staffCookie);
    expect(res.status).toBe(403);
  });

  it("returns 200 for a Requester", async () => {
    const res = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/dashboard/requester — metrics and scoping (AC-02, AUTH-06)", () => {
  it("returns all-zero metrics and an empty recent list for a Requester with no tickets", async () => {
    const freshRequester = await createTestUser("REQUESTER");
    const freshCookie = await loginTestUser(freshRequester.email, freshRequester.password);

    const res = await request(app).get("/api/dashboard/requester").set("Cookie", freshCookie);
    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({ myOpen: 0, inProgress: 0, resolved: 0, closed: 0 });
    expect(res.body.recentTickets).toEqual([]);

    await cleanupTestUser(freshRequester.id);
  });

  it("groups statuses into the right metric bucket", async () => {
    const t1 = await createTicket(requesterCookie, "New ticket");           // NEW -> myOpen
    const t2 = await createTicket(requesterCookie, "Open ticket");
    await setStatus(t2, "OPEN", staffCookie);                               // OPEN -> myOpen
    const t3 = await createTicket(requesterCookie, "In progress ticket");
    await setStatus(t3, "OPEN", staffCookie);
    await setStatus(t3, "IN_PROGRESS", staffCookie);                        // IN_PROGRESS -> inProgress
    const t4 = await createTicket(requesterCookie, "Resolved ticket");
    await setStatus(t4, "OPEN", staffCookie);
    await setStatus(t4, "IN_PROGRESS", staffCookie);
    await setStatus(t4, "RESOLVED", staffCookie);                           // RESOLVED -> resolved
    const t5 = await createTicket(requesterCookie, "Closed ticket");
    await setStatus(t5, "OPEN", staffCookie);
    await setStatus(t5, "IN_PROGRESS", staffCookie);
    await setStatus(t5, "RESOLVED", staffCookie);
    await setStatus(t5, "CLOSED", staffCookie);                             // CLOSED -> closed

    const res = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    expect(res.status).toBe(200);
    expect(res.body.metrics.myOpen).toBeGreaterThanOrEqual(2);     // t1, t2
    expect(res.body.metrics.inProgress).toBeGreaterThanOrEqual(1); // t3
    expect(res.body.metrics.resolved).toBeGreaterThanOrEqual(1);   // t4
    expect(res.body.metrics.closed).toBeGreaterThanOrEqual(1);     // t5
  });

  it("never includes another Requester's tickets, even in recentTickets", async () => {
    await createTicket(otherRequesterCookie, "Someone else's ticket — should never appear");

    const res = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    expect(res.status).toBe(200);
    const titles = res.body.recentTickets.map((t: { title: string }) => t.title);
    expect(titles).not.toContain("Someone else's ticket — should never appear");
  });

  it("limits recentTickets to 5 and orders them newest-updated-first", async () => {
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      ids.push(await createTicket(requesterCookie, `Recency test ticket ${i}`));
    }
    // Touch the first one last so it should sort to the top.
    await setStatus(ids[0], "OPEN", staffCookie);

    const res = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    expect(res.status).toBe(200);
    expect(res.body.recentTickets.length).toBeLessThanOrEqual(5);
    expect(res.body.recentTickets[0].id).toBe(ids[0]);
  });
});