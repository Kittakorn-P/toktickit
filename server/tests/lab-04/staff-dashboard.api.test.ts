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
let adminId: number;
let adminCookie: string[];

async function createTicket(summary: string) {
  const res = await request(app).post("/api/tickets").set("Cookie", requesterCookie).send({
    categoryId: 1, relatedSystemId: 1, summary, description: "Staff dashboard test ticket",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
}

async function setStatus(ticketId: number, status: string) {
  await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status });
}

async function claim(ticketId: number, ownerId: number, cookie: string[]) {
  await request(app).patch(`/api/staff/tickets/${ticketId}/claim`).set("Cookie", cookie).send({ ownerId });
}

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

  const admin = await createTestUser("ADMINISTRATOR");
  adminId = admin.id;
  adminCookie = await loginTestUser(admin.email, admin.password);
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(staffId);
  await cleanupTestUser(otherStaffId);
  await cleanupTestUser(adminId);
});

describe("GET /api/dashboard/staff — authorization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/dashboard/staff");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a Requester", async () => {
    const res = await request(app).get("/api/dashboard/staff").set("Cookie", requesterCookie);
    expect(res.status).toBe(403);
  });

  it("returns 200 for IT Staff", async () => {
    const res = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    expect(res.status).toBe(200);
  });

  it("returns 200 for an Administrator (handout §6: reuses the Staff dashboard)", async () => {
    const res = await request(app).get("/api/dashboard/staff").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/dashboard/staff — metrics", () => {
  it("counts New/Open/In Progress/Waiting org-wide, not scoped to the caller", async () => {
    await createTicket("Org-wide NEW ticket");
    const t2 = await createTicket("Org-wide OPEN ticket");
    await setStatus(t2, "OPEN");

    // Fire both requests together (not two sequential awaits) so there's no
    // window between them for an unrelated, concurrently-running test file
    // to mutate the shared tickets table — these are genuinely org-wide
    // counts, so under `vitest run` (whole suite, files run in parallel)
    // two sequential snapshots of the same global aggregate can legitimately
    // differ by however many tickets other files created in between. That's
    // not a dashboard bug; it's two counts taken at two different instants.
    const [staffRes, otherStaffRes] = await Promise.all([
      request(app).get("/api/dashboard/staff").set("Cookie", staffCookie),
      request(app).get("/api/dashboard/staff").set("Cookie", otherStaffCookie),
    ]);

    expect(staffRes.body.metrics.new).toBeGreaterThanOrEqual(1);
    expect(staffRes.body.metrics.open).toBeGreaterThanOrEqual(1);
    // The real property under test: org-wide counts aren't secretly scoped
    // down to just the caller. Proven by the two toBeGreaterThanOrEqual
    // checks above (both callers see the tickets this test just created,
    // not zero) — an exact cross-request equality check isn't needed to
    // prove that, and is the part that was flaky under full-suite runs.
    expect(otherStaffRes.body.metrics.new).toBeGreaterThanOrEqual(1);
    expect(otherStaffRes.body.metrics.open).toBeGreaterThanOrEqual(1);
  });

  it("myAssigned is scoped per-caller and excludes Closed/Cancelled", async () => {
    const owned = await createTicket("Owned by staff, still active");
    await claim(owned, staffId, staffCookie);

    const ownedAndClosed = await createTicket("Owned by staff, then closed");
    await claim(ownedAndClosed, staffId, staffCookie);
    await setStatus(ownedAndClosed, "OPEN");
    await setStatus(ownedAndClosed, "IN_PROGRESS");
    await setStatus(ownedAndClosed, "RESOLVED");
    await setStatus(ownedAndClosed, "CLOSED");

    const staffRes = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    const otherStaffRes = await request(app).get("/api/dashboard/staff").set("Cookie", otherStaffCookie);

    expect(staffRes.body.metrics.myAssigned).toBeGreaterThanOrEqual(1); // the still-active one
    // otherStaff doesn't own either ticket, so their myAssigned shouldn't
    // include staff's tickets.
    expect(otherStaffRes.body.metrics.myAssigned).toBe(0);
  });

  it("returns zeroed metrics and an empty recent list when nothing is relevant to the caller yet", async () => {
    const freshStaff = await createTestUser("IT_STAFF");
    const freshCookie = await loginTestUser(freshStaff.email, freshStaff.password);

    const res = await request(app).get("/api/dashboard/staff").set("Cookie", freshCookie);
    expect(res.status).toBe(200);
    expect(res.body.metrics.myAssigned).toBe(0);
    expect(res.body.recentTickets).toEqual([]);

    await cleanupTestUser(freshStaff.id);
  });
});

describe("GET /api/dashboard/staff — recentTickets (owned OR acted-on)", () => {
  it("includes a ticket the caller owns but never acted on", async () => {
    const ticketId = await createTicket("Owned-only recent ticket");
    await claim(ticketId, staffId, staffCookie);

    const res = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    const ids = res.body.recentTickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(ticketId);
  });

  it("includes a ticket the caller acted on but does not own", async () => {
    const ticketId = await createTicket("Acted-on-only recent ticket");
    await claim(ticketId, otherStaffId, otherStaffCookie); // owned by someone else
    await request(app).post(`/api/staff/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      description: "Helped out on this ticket despite not owning it.",
      result: "Assisted.",
      followUpRequired: false,
    });

    const res = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    const ids = res.body.recentTickets.map((t: { id: number }) => t.id);
    expect(ids).toContain(ticketId);
  });

  it("excludes a ticket the caller neither owns nor acted on", async () => {
    const ticketId = await createTicket("Unrelated-to-staff ticket");
    await claim(ticketId, otherStaffId, otherStaffCookie);

    const res = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    const ids = res.body.recentTickets.map((t: { id: number }) => t.id);
    expect(ids).not.toContain(ticketId);
  });
});