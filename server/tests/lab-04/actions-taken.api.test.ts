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

// Separate tickets per scenario so list/ordering assertions don't interfere.
let ticketWithActionsId: number;
let emptyTicketId: number;

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

  const ticketA = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1,
    summary: "Actions Taken test ticket A", description: "For create/list/edit tests",
    requestedPriority: "MEDIUM",
  });
  ticketWithActionsId = ticketA.body.id;

  const ticketB = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1,
    summary: "Actions Taken test ticket B", description: "For empty-state tests",
    requestedPriority: "LOW",
  });
  emptyTicketId = ticketB.body.id;
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
        description: "Escalated to network team.",
        result: "Pending response.",
        followUpRequired: true,
        followUpNote: "Check back in 2 business days.",
      });
    expect(res.status).toBe(201);
    expect(res.body.followUpNote).toBe("Check back in 2 business days.");
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

  it("API-06: a ticket with zero actions returns an empty array, not an error", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.actions).toEqual([]);
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

  beforeAll(async () => {
    const created = await request(app)
      .post(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie)
      .send({ description: "Initial description.", result: "Initial result.", followUpRequired: false });
    actionId = created.body.id;
    actionUpdatedAt = created.body.updatedAt;
  });

  it("allows the author to edit", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${emptyTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ result: "Updated result after follow-up.", updatedAt: actionUpdatedAt });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe("Updated result after follow-up.");
    actionUpdatedAt = res.body.updatedAt;
  });

  it("AUTH-04: rejects edit from a non-author, non-Admin IT Staff member", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${emptyTicketId}/actions/${actionId}`)
      .set("Cookie", otherStaffCookie)
      .send({ result: "Trying to edit someone else's action." });
    expect(res.status).toBe(403);
  });

  it("API-04: rejects a stale updatedAt with 409 and does not apply the change", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${emptyTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ result: "Stale write attempt.", updatedAt: "2000-01-01T00:00:00.000Z" });
    expect(res.status).toBe(409);

    const check = await request(app)
      .get(`/api/staff/tickets/${emptyTicketId}/actions`)
      .set("Cookie", staffCookie);
    const found = check.body.actions.find((a: { id: number }) => a.id === actionId);
    expect(found.result).not.toBe("Stale write attempt.");
  });

  it("enforces the follow-up-note rule on edit as well as create", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${emptyTicketId}/actions/${actionId}`)
      .set("Cookie", staffCookie)
      .send({ followUpRequired: true, followUpNote: "", updatedAt: actionUpdatedAt });
    expect(res.status).toBe(422);
  });
});