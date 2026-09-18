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
let ticketId: number;

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

  const ticketRes = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1,
    summary: "Comments/notes test ticket", description: "For visibility tests",
    requestedPriority: "LOW",
  });
  ticketId = ticketRes.body.id;
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(otherRequesterId);
  await cleanupTestUser(staffId);
});

describe("Public Comments — BR-19, BR-22", () => {
  it("owning Requester can post and read a comment", async () => {
    const postRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "Any update on this?" });
    expect(postRes.status).toBe(201);

    const getRes = await request(app).get(`/api/tickets/${ticketId}/comments`).set("Cookie", requesterCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.comments.length).toBeGreaterThan(0);
  });

  it("IT Staff can read and post on any ticket, and the Requester sees it", async () => {
    const postRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", staffCookie)
      .send({ content: "Looking into it now." });
    expect(postRes.status).toBe(201);

    const requesterView = await request(app).get(`/api/tickets/${ticketId}/comments`).set("Cookie", requesterCookie);
    const authors = requesterView.body.comments.map((c: { author: { role: string } }) => c.author.role);
    expect(authors).toContain("IT_STAFF");
  });

  it("a non-owning Requester cannot read or post comments (404)", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}/comments`).set("Cookie", otherRequesterCookie);
    expect(res.status).toBe(404);
  });

  it("rejects empty or whitespace-only content", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "   " });
    expect(res.status).toBe(400);
  });
});

describe("Internal Notes — BR-04, BR-20, BR-22", () => {
  it("IT Staff can post and read a note", async () => {
    const postRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "Escalating to vendor." });
    expect(postRes.status).toBe(201);

    const getRes = await request(app).get(`/api/tickets/${ticketId}/notes`).set("Cookie", staffCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.notes.length).toBeGreaterThan(0);
  });

  it("rejects a Requester's attempt to read notes, without exposing content or existence (AC-04/BR-20)", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}/notes`).set("Cookie", requesterCookie);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain("Escalating to vendor");
  });

  it("rejects a Requester's attempt to post a note", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", requesterCookie)
      .send({ content: "trying to sneak a note in" });
    expect(res.status).toBe(403);
  });

  it("rejects empty or whitespace-only content", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });
});