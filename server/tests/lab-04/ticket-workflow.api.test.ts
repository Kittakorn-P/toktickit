import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let requesterId: number;
let requesterCookie: string[];
let staffId: number;
let staffCookie: string[];

async function createTicket(summary: string) {
  const res = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1, summary, description: "Workflow test ticket",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
}

beforeAll(async () => {
  const requester = await createTestUser("REQUESTER");
  requesterId = requester.id;
  requesterCookie = await loginTestUser(requester.email, requester.password);

  const staff = await createTestUser("IT_STAFF");
  staffId = staff.id;
  staffCookie = await loginTestUser(staff.email, staff.password);
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(staffId);
});

describe("PATCH /api/staff/tickets/:id/status — BR-08 transition matrix", () => {
  it("WF-01: full lifecycle NEW -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED succeeds one hop at a time", async () => {
    const ticketId = await createTicket("Full lifecycle ticket");
    const steps = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    for (const status of steps) {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set("Cookie", staffCookie)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe(status);
    }
  });

  it("API-08: rejects a transition not in the matrix (NEW -> IN_PROGRESS, skipping OPEN)", async () => {
    const ticketId = await createTicket("Invalid skip-ahead ticket");
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(422);
  });

  it("WF-03: CANCELLED is reachable from NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, and REOPENED", async () => {
    const froms: { status: string; setup: string[] }[] = [
      { status: "NEW", setup: [] },
      { status: "OPEN", setup: ["OPEN"] },
      { status: "IN_PROGRESS", setup: ["OPEN", "IN_PROGRESS"] },
      { status: "WAITING_FOR_REQUESTER", setup: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"] },
      { status: "REOPENED", setup: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED"] },
    ];
    for (const { setup } of froms) {
      const ticketId = await createTicket("Cancellation path ticket");
      for (const step of setup) {
        await request(app)
          .patch(`/api/staff/tickets/${ticketId}/status`)
          .set("Cookie", staffCookie)
          .send({ status: step });
      }
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "CANCELLED" });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CANCELLED");
    }
  });

  it("CANCELLED is terminal — no outbound transition succeeds", async () => {
    const ticketId = await createTicket("Terminal cancelled ticket");
    await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status: "CANCELLED" });
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });
    expect(res.status).toBe(422);
  });

  it("API-09: rejects a stale updatedAt on status change with 409", async () => {
    const ticketId = await createTicket("Concurrency ticket");
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN", updatedAt: "2000-01-01T00:00:00.000Z" });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/tickets/:id/status — Requester Reopen only (BR-06, AUTH-03)", () => {
  it("WF-02: a Requester can reopen a Resolved ticket", async () => {
    const ticketId = await createTicket("Requester reopen ticket");
    await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status: "OPEN" });
    await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status: "IN_PROGRESS" });
    await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status: "RESOLVED" });

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "REOPENED" });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("REOPENED");
  });

  it("AUTH-03: a Requester cannot request any transition other than Reopened", async () => {
    const ticketId = await createTicket("Requester illegal transition ticket");
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "RESOLVED" });
    expect(res.status).toBe(403);
  });

  it("rejects Reopen when the ticket isn't actually Resolved yet", async () => {
    const ticketId = await createTicket("Requester premature reopen ticket");
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "REOPENED" });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/tickets/:id/looks-resolved — BR-07, AC-05", () => {
  it("WF-04: sets the advisory flag without changing currentStatus", async () => {
    const ticketId = await createTicket("Looks resolved ticket");
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/looks-resolved`)
      .set("Cookie", requesterCookie)
      .send({ looksResolved: true });
    expect(res.status).toBe(200);
    expect(res.body.looksResolvedByRequester).toBe(true);

    const detail = await request(app).get(`/api/staff/tickets/${ticketId}`).set("Cookie", staffCookie);
    expect(detail.body.currentStatus).toBe("NEW");
    expect(detail.body.looksResolvedByRequester).toBe(true);
  });

  it("is only settable by the owning Requester", async () => {
    const ticketId = await createTicket("Looks resolved staff-blocked ticket");
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/looks-resolved`)
      .set("Cookie", staffCookie)
      .send({ looksResolved: true });
    expect(res.status).toBe(403);
  });
});