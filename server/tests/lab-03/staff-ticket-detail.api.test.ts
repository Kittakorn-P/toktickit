import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let requesterId: number;
let requesterCookie: string[];
let staffId: number;
let staffCookie: string[];
let otherStaffId: number;
let otherStaffCookie: string[];
let ticketId: number;

beforeAll(async () => {
  const requester = await createTestUser("REQUESTER");
  requesterId = requester.id;
  requesterCookie = await loginTestUser(requester.email, requester.password);

  const staff = await createTestUser("IT_STAFF");
  staffId = staff.id;
  staffCookie = await loginTestUser(staff.email, staff.password);

  const otherStaff = await createTestUser("IT_STAFF");
  otherStaffId = otherStaff.id;
  otherStaffCookie = await loginTestUser(otherStaff.email, otherStaff.password);

  const ticketRes = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1,
    summary: "Staff detail test ticket", description: "For claim/priority/status tests",
    requestedPriority: "MEDIUM",
  });
  ticketId = ticketRes.body.id;
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(staffId);
  await cleanupTestUser(otherStaffId);
});

describe("PATCH /api/staff/tickets/:id/claim — BR-16, BR-17", () => {
  it("claims an unassigned ticket", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/claim`)
      .set("Cookie", staffCookie)
      .send({ ownerId: staffId });
    expect(res.status).toBe(200);
    expect(res.body.owner.id).toBe(staffId);
  });

  it("allows another IT Staff to reassign an already-owned ticket", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/claim`)
      .set("Cookie", otherStaffCookie)
      .send({ ownerId: otherStaffId });
    expect(res.status).toBe(200);
    expect(res.body.owner.id).toBe(otherStaffId);
  });

  it("rejects an ownerId that is not an active IT Staff/Administrator", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/claim`)
      .set("Cookie", staffCookie)
      .send({ ownerId: requesterId });
    expect(res.status).toBe(400);
  });

  it("returns 403 for a Requester attempting to claim", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/claim`)
      .set("Cookie", requesterCookie)
      .send({ ownerId: requesterId });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/staff/tickets/:id/priority — BR-18", () => {
  it("updates IT Priority independently of Requested Priority", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("HIGH");

    const detail = await request(app).get(`/api/staff/tickets/${ticketId}`).set("Cookie", staffCookie);
    expect(detail.body.requestedPriority).toBe("MEDIUM");
    expect(detail.body.itPriority).toBe("HIGH");
  });

  it("rejects an invalid priority value", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "URGENT" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/tickets/:id/status — BR-21, and BR-08 (Lab 4 matrix)", () => {
  it("allows IT Staff to change status via a valid transition", async () => {
    // NEW -> OPEN first, since NEW -> IN_PROGRESS directly is no longer a
    // valid transition as of Lab 4's status-transition matrix.
    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("IN_PROGRESS");
  });

  it("rejects a Requester's direct attempt to change status", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "RESOLVED" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid status value", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "NOT_A_REAL_STATUS" });
    expect(res.status).toBe(400);
  });

  it("LAB 4: rejects a transition not permitted by the status matrix (already IN_PROGRESS here, so WAITING_FOR_REQUESTER is valid but RESOLVED -> back to NEW is not)", async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "NEW" });
    expect(res.status).toBe(422);
  });
});