import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterId: number;
let otherRequesterId: number;
let ticketId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.requesterUser.findMany({ where: { isActive: true } });
  requesterId = requesters[0].id;
  otherRequesterId = requesters[1].id;

  const ticketRes = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", String(requesterId))
    .send({
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Attachment test ticket",
      description: "For attachment lifecycle tests",
      requestedPriority: "LOW",
    });
  ticketId = ticketRes.body.id;
});

describe("Attachment lifecycle", () => {
  it("uploads a valid PNG and returns 201", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("file", Buffer.from("fake-png-bytes"), {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("screenshot.png");
    expect(res.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type with 400", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("file", Buffer.from("not-allowed"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
  });

  it("rejects a file over 5MB with 400", async () => {
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("file", bigBuffer, {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
  });

  it("rejects a 6th active attachment with 409", async () => {
    // one was already uploaded in the first test; add 4 more to reach 5
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Requester-Id", String(requesterId))
        .attach("file", Buffer.from("x"), {
          filename: `file${i}.png`,
          contentType: "image/png",
        });
    }

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("file", Buffer.from("x"), {
        filename: "one-too-many.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(409);
  });

  it("rejects an upload to a ticket owned by another requester with 404", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(otherRequesterId))
      .attach("file", Buffer.from("x"), {
        filename: "intrusion.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(404);
  });

  it("soft-removes an owned attachment and it becomes non-downloadable", async () => {
    const listRes = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId));
    const attachmentId = listRes.body.attachments[0].id;

    const removeRes = await request(app)
      .patch(`/api/attachments/${attachmentId}/remove`)
      .set("X-Requester-Id", String(requesterId));
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterId));
    expect(downloadRes.status).toBe(404);
  });

  it("rejects removal of an attachment owned by another requester with 404", async () => {
    const listRes = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId));
    const activeAttachment = listRes.body.attachments.find(
      (a: { isRemoved: boolean }) => !a.isRemoved
    );

    const res = await request(app)
      .patch(`/api/attachments/${activeAttachment.id}/remove`)
      .set("X-Requester-Id", String(otherRequesterId));
    expect(res.status).toBe(404);
  });

  // BR-14: if attachment upload fails, the Ticket itself remains saved and
  // retrievable — the failure is scoped to the attachment, not the Ticket.
  it("keeps the Ticket intact and retrievable after a failed attachment upload", async () => {
    const before = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(requesterId));
    expect(before.status).toBe(200);

    const failedUpload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("file", Buffer.from("not allowed"), {
        filename: "bad.txt",
        contentType: "text/plain",
      });
    expect(failedUpload.status).toBe(400);

    const after = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(requesterId));
    expect(after.status).toBe(200);
    expect(after.body.id).toBe(ticketId);
    expect(after.body.summary).toBe(before.body.summary);
  });
});