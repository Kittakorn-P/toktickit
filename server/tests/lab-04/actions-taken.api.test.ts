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
let otherStaffId: number;
let otherStaffCookie: string[];

// Separate tickets per scenario so list/ordering/terminal-state assertions
// don't interfere with each other.
let ticketWithActionsId: number;
let emptyTicketId: number;

async function createTicket(summary: string, cookie: string[] = requesterCookie) {
  const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
    categoryId: 1, relatedSystemId: 1, summary, description: "Actions Taken test ticket",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
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

  const otherStaff = await createTestUser("IT_STAFF");
  otherStaffId = otherStaff.id;
  otherStaffCookie = await loginTestUser(otherStaff.email, otherStaff.password);

  ticketWithActionsId = await createTicket("Actions Taken test ticket A — create/list/edit");
  emptyTicketId = await createTicket("Actions Taken test ticket B — empty-state");
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(otherRequesterId);
  await cleanupTestUser(staffId);
  await cleanupTestUser(otherStaffId);
});

describe("POST /api/staff/tickets/:id/actions — AC-01, BR-03, BR-04", () => {
  it("API-01/API-02: creates an action; performedBy is server-set from session, client value ignored", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", staffCookie)
      .send({
        description: "Investigated the issue.",
        result: "Root cause identified.",
        followUpRequired: false,
        performedById: otherStaffId, // should be ignored — server sets this
      });
    expect(res.status).toBe(201);
    expect(res.body.performedBy.id).toBe(staffId);
    expect(res.body.performedBy.id).not.toBe(otherStaffId);
  });

  it("API-03/AC-03: rejects followUpRequired=true with an empty followUpNote", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", staffCookie)
      .send({
        description: "Escalated to network team.",
        result: "Pending response.",
        followUpRequired: true,
        followUpNote: "",
      });
    expect(res.status).toBe(422);
    expect(res.body.errors.followUpNote).toBeDefined();
  });

  it("accepts followUpRequired=true with a non-empty followUpNote", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", staffCookie)
      .send({
        description: "Escalated to network team, second attempt.",
        result: "Pending response.",
        followUpRequired: true,
        followUpNote: "Check back in 2 business days.",
      });
    expect(res.status).toBe(201);
    expect(res.body.followUpNote).toBe("Check back in 2 business days.");
  });

  it("rejects a description over the max length instead of silently truncating", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", staffCookie)
      .send({ description: "x".repeat(4001), result: "Result text." });
    expect(res.status).toBe(422);
    expect(res.body.errors.description).toBeDefined();
  });

  it("REVIEW FIX: a duplicate submission within the retry window returns the existing action, not a second one", async () => {
    const payload = {
      description: "Double-click guard test action.",
      result: "Same content submitted twice quickly.",
      followUpRequired: false,
    };
    const first = await request(app)
      .post(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);

    const list = await request(app)
      .get(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie);
    const matching = list.body.actions.filter(
      (a: { description: string }) => a.description === payload.description,
    );
    expect(matching.length).toBe(1);
  });

  it("REVIEW FIX: rejects creating an action on a Closed ticket", async () => {
    const closedTicketId = await createTicket("Closed ticket — action rejected");
    await request(app).patch(`/api/staff/tickets/${closedTicketId}/status`).set("Cookie", staffCookie).send({ status: "OPEN" });
    await request(app).patch(`/api/staff/tickets/${closedTicketId}/status`).set("Cookie", staffCookie).send({ status: "IN_PROGRESS" });
    await request(app).patch(`/api/staff/tickets/${closedTicketId}/status`).set("Cookie", staffCookie).send({ status: "RESOLVED" });
    await request(app).patch(`/api/staff/tickets/${closedTicketId}/status`).set("Cookie", staffCookie).send({ status: "CLOSED" });

    const res = await request(app)
      .post(`/api/staff/tickets/${closedTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send({ description: "Trying to add to a closed ticket.", result: "Should be rejected." });
    expect(res.status).toBe(422);
  });

  it("REVIEW FIX: rejects creating an action on a Cancelled ticket", async () => {
    const cancelledTicketId = await createTicket("Cancelled ticket — action rejected");
    await request(app).patch(`/api/staff/tickets/${cancelledTicketId}/status`).set("Cookie", staffCookie).send({ status: "CANCELLED" });

    const res = await request(app)
      .post(`/api/staff/tickets/${cancelledTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send({ description: "Trying to add to a cancelled ticket.", result: "Should be rejected." });
    expect(res.status).toBe(422);
  });

  it("AUTH-01: a Requester cannot create an action", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", requesterCookie)
      .send({ description: "Trying anyway.", result: "Should not work." });
    expect(res.status).toBe(403);
  });

  it("AUTH-05: unauthenticated request is rejected", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .send({ description: "No session.", result: "No session." });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/staff/tickets/:id/actions and /api/tickets/:id/actions — API-05, API-06, FR-05", () => {
  it("API-05: staff sees actions ordered oldest to newest", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.actions.length).toBeGreaterThanOrEqual(2);
    const times = res.body.actions.map((a: { actionDateTime: string }) => new Date(a.actionDateTime).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it("FR-05: the owning Requester can view (read-only) their ticket's actions", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", requesterCookie);
    expect(res.status).toBe(200);
    expect(res.body.actions.length).toBeGreaterThanOrEqual(2);
  });

  it("AUTH-02: a Requester requesting another user's ticket actions gets 404, not 403", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketWithActionsId}/actions`)
      .set("Cookie", otherRequesterCookie);
    expect(res.status).toBe(404);
  });

  it("AUTH-05: unauthenticated GET is rejected", async () => {
    const res = await request(app).get(`/api/staff/tickets/${ticketWithActionsId}/actions`);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/staff/tickets/:id/actions/:actionId — BR-05, BR-09", () => {
  let actionId: number;
  let actionUpdatedAt: string;
  let editTicketId: number;

  beforeAll(async () => {
    editTicketId = await createTicket("PATCH-specific ticket");
    const created = await request(app)
      .post(`/api/staff/tickets/${editTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send({ description: "Initial description.", result: "Initial result.", followUpRequired: false });
    actionId = created.body.id;
    actionUpdatedAt = created.body.updatedAt;
  });

  it("REVIEW FIX: updatedAt is now required — omitting it is rejected with 400, not silently unchecked", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ result: "Trying without updatedAt." });
    expect(res.status).toBe(400);
  });

  it("REVIEW FIX: any IT Staff/Admin may edit, not just the original author (handout FR-02)", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", otherStaffCookie)
      .send({ result: "Edited by a different staff member.", updatedAt: actionUpdatedAt });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe("Edited by a different staff member.");
    actionUpdatedAt = res.body.updatedAt;
  });

  it("REVIEW FIX: a non-string description is rejected with 422, not a 500", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ description: 12345, updatedAt: actionUpdatedAt });
    expect(res.status).toBe(422);
    expect(res.body.errors.description).toBeDefined();
  });

  it("REVIEW FIX: a followUpNote over the max length is rejected", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ followUpRequired: true, followUpNote: "x".repeat(2001), updatedAt: actionUpdatedAt });
    expect(res.status).toBe(422);
  });

  it("API-04: rejects a stale updatedAt with 409 and does not apply the change (atomic check)", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ result: "Stale write attempt.", updatedAt: "2000-01-01T00:00:00.000Z" });
    expect(res.status).toBe(409);

    const check = await request(app)
      .get(`/api/staff/tickets/${editTicketId}/actions`)
      .set("Cookie", staffCookie);
    const found = check.body.actions.find((a: { id: number }) => a.id === actionId);
    expect(found.result).not.toBe("Stale write attempt.");
  });

  it("enforces the follow-up-note rule on edit as well as create", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ followUpRequired: true, followUpNote: "", updatedAt: actionUpdatedAt });
    expect(res.status).toBe(422);
  });

  it("REVIEW FIX: rejects editing an action on a Closed ticket", async () => {
    await request(app).patch(`/api/staff/tickets/${editTicketId}/status`).set("Cookie", staffCookie).send({ status: "OPEN" });
    await request(app).patch(`/api/staff/tickets/${editTicketId}/status`).set("Cookie", staffCookie).send({ status: "IN_PROGRESS" });
    await request(app).patch(`/api/staff/tickets/${editTicketId}/status`).set("Cookie", staffCookie).send({ status: "RESOLVED" });
    await request(app).patch(`/api/staff/tickets/${editTicketId}/status`).set("Cookie", staffCookie).send({ status: "CLOSED" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${editTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ result: "Trying to edit after close.", updatedAt: actionUpdatedAt });
    expect(res.status).toBe(422);
  });
});