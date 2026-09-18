import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestUser, loginTestUser, cleanupTestUser } from "../helpers/testUser.js";

let ownerId: number;
let ownerCookie: string[];
let otherId: number;
let otherCookie: string[];
let ticketId: number;

beforeAll(async () => {
  const owner = await createTestUser("REQUESTER");
  ownerId = owner.id;
  ownerCookie = await loginTestUser(owner.email, owner.password);

  const other = await createTestUser("REQUESTER");
  otherId = other.id;
  otherCookie = await loginTestUser(other.email, other.password);

  const ticketRes = await request(app)
    .post("/api/tickets")
    .set("Cookie", ownerCookie)
    .send({
      categoryId: 1, relatedSystemId: 1,
      summary: "Attachment test ticket", description: "For attachment lifecycle tests",
      requestedPriority: "LOW",
    });
  ticketId = ticketRes.body.id;
});

afterAll(async () => {
  await cleanupTestUser(ownerId);
  await cleanupTestUser(otherId);
});

describe("Attachment lifecycle", () => {
  it("uploads a valid PNG and returns 201", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", ownerCookie)
      .attach("file", Buffer.from("fake-png-bytes"), { filename: "screenshot.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("screenshot.png");
    expect(res.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type with 400", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", ownerCookie)
      .attach("file", Buffer.from("not-allowed"), { filename: "notes.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  it("rejects a file over 5MB with 400", async () => {
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", ownerCookie)
      .attach("file", bigBuffer, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("rejects a 6th active attachment with 409", async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("Cookie", ownerCookie)
        .attach("file", Buffer.from("x"), { filename: `file${i}.png`, contentType: "image/png" });
    }
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", ownerCookie)
      .attach("file", Buffer.from("x"), { filename: "one-too-many.png", contentType: "image/png" });
    expect(res.status).toBe(409);
  });

  it("rejects an upload to a ticket owned by another requester with 404", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", otherCookie)
      .attach("file", Buffer.from("x"), { filename: "intrusion.png", contentType: "image/png" });
    expect(res.status).toBe(404);
  });

  it("soft-removes an owned attachment and it becomes non-downloadable", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("Cookie", ownerCookie);
    const attachmentId = listRes.body.attachments[0].id;

    const removeRes = await request(app).patch(`/api/attachments/${attachmentId}/remove`).set("Cookie", ownerCookie);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    const downloadRes = await request(app).get(`/api/attachments/${attachmentId}/download`).set("Cookie", ownerCookie);
    expect(downloadRes.status).toBe(404);
  });

  it("rejects removal of an attachment owned by another requester with 404", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("Cookie", ownerCookie);
    const activeAttachment = listRes.body.attachments.find((a: { isRemoved: boolean }) => !a.isRemoved);

    const res = await request(app).patch(`/api/attachments/${activeAttachment.id}/remove`).set("Cookie", otherCookie);
    expect(res.status).toBe(404);
  });

  it("keeps the Ticket intact and retrievable after a failed attachment upload", async () => {
    const before = await request(app).get(`/api/tickets/${ticketId}`).set("Cookie", ownerCookie);
    expect(before.status).toBe(200);

    const failedUpload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", ownerCookie)
      .attach("file", Buffer.from("not allowed"), { filename: "bad.txt", contentType: "text/plain" });
    expect(failedUpload.status).toBe(400);

    const after = await request(app).get(`/api/tickets/${ticketId}`).set("Cookie", ownerCookie);
    expect(after.status).toBe(200);
    expect(after.body.id).toBe(ticketId);
    expect(after.body.summary).toBe(before.body.summary);
  });
});