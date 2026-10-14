import bcrypt from "bcrypt";
import { getPrisma } from "../src/prisma.js";

const prisma = getPrisma();
const SALT_ROUNDS = 10;
// Local-dev-only initial password for every seeded account. Not a real secret,
// not deployed anywhere — every seeded user must change it at first login
// (mustChangePassword: true) per BR-02.
const DEV_PASSWORD = "ChangeMe123!";

async function main() {
  // Categories — unchanged from Lab 2
  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Related Systems — unchanged from Lab 2
  const relatedSystems = [
    "Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Printer", "Corporate Laptop",
  ];
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, SALT_ROUNDS);

  // Requesters — evolved from Lab 2's RequesterUser rows, now real authenticated Users.
  // Same 5 people/emails/ids as Lab 2 so existing Ticket.requesterId stays valid.
  const requesters: { name: string; email: string; isActive: boolean }[] = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", isActive: true },
    { name: "Inactive Ida", email: "inactive.ida@example.com", isActive: false },
  ];
  for (const r of requesters) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: { passwordHash, role: "REQUESTER", mustChangePassword: true },
      create: { ...r, role: "REQUESTER", passwordHash, mustChangePassword: true },
    });
  }

  // IT Staff — 3 active + 1 inactive (handout §5.3 minimum)
  const itStaff: { name: string; email: string; isActive: boolean }[] = [
    { name: "Priya Nair", email: "priya.nair@tiktockit.com", isActive: true },
    { name: "Carlos Mendez", email: "carlos.mendez@tiktockit.com", isActive: true },
    { name: "Wei Zhang", email: "wei.zhang@tiktockit.com", isActive: true },
    { name: "Inactive Ivan", email: "inactive.ivan@tiktockit.com", isActive: false },
  ];
  for (const s of itStaff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, role: "IT_STAFF", mustChangePassword: true },
      create: { ...s, role: "IT_STAFF", passwordHash, mustChangePassword: true },
    });
  }

  // Administrator — 1 active (handout §5.3 minimum)
  await prisma.user.upsert({
    where: { email: "admin@tiktockit.com" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@tiktockit.com",
      isActive: true,
      role: "ADMINISTRATOR",
      passwordHash,
      mustChangePassword: true,
    },
  });

  console.log("Lab 3 seed complete. All seeded accounts use local-dev-only password:", DEV_PASSWORD);

  await seedActionsTaken();
}

// ============================================================================
// LAB 4 ADDITIONS — Actions Taken seed
//
// ASSUMPTION: this seed script doesn't create Tickets itself (that must be
// happening in a separate Lab 2/3 seed step not shown here), so this
// function seeds Actions Taken against whatever Tickets already exist by
// the time it runs. If your Ticket-seeding lives elsewhere and runs after
// this file, move the `await seedActionsTaken()` call to wherever Ticket
// seeding finishes instead.
// ============================================================================
async function seedActionsTaken() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["IT_STAFF", "ADMINISTRATOR"] }, isActive: true },
    orderBy: { id: "asc" },
  });
  const tickets = await prisma.ticket.findMany({ orderBy: { id: "asc" } });

  if (staff.length === 0 || tickets.length === 0) {
    console.log("Skipping Lab 4 Actions Taken seed — no active staff or tickets found yet.");
    return;
  }

  // Idempotent: clear and re-seed rather than duplicating on repeated
  // `npx prisma db seed` runs.
  await prisma.actionTaken.deleteMany({});

  const demoActions = [
    {
      description: "Investigated the reported issue and reproduced it locally.",
      result: "Root cause identified.",
      followUpRequired: true,
      followUpNote: "Waiting on vendor patch before this can be closed out.",
      attachmentNotes: null as string | null,
    },
    {
      description: "Applied a configuration fix and verified with the requester.",
      result: "Issue resolved.",
      followUpRequired: false,
      followUpNote: null as string | null,
      attachmentNotes: "See screenshot IMG_0231.jpg in the ticket folder.",
    },
    {
      description: "Escalated to the network team for further diagnosis.",
      result: "Pending network team response.",
      followUpRequired: true,
      followUpNote: "Follow up with the network team in 2 business days.",
      attachmentNotes: null as string | null,
    },
  ];

  // tickets[0]: intentionally left with zero actions.
  // tickets[1]: exactly one action.
  if (tickets[1]) {
    await prisma.actionTaken.create({
      data: { ticketId: tickets[1].id, performedById: staff[0].id, ...demoActions[0] },
    });
  }
  // tickets[2]: multiple actions by different staff members (BR-02 — the
  // Ticket Owner and the Action Taken performer don't have to be the same).
  if (tickets[2]) {
    await prisma.actionTaken.create({
      data: { ticketId: tickets[2].id, performedById: staff[0].id, ...demoActions[0] },
    });
    const secondStaff = staff[Math.min(1, staff.length - 1)];
    await prisma.actionTaken.create({
      data: { ticketId: tickets[2].id, performedById: secondStaff.id, ...demoActions[1] },
    });
    // Also demonstrates the "looks resolved" advisory flag for the UI.
    await prisma.ticket.update({
      where: { id: tickets[2].id },
      data: { looksResolvedByRequester: true },
    });
  }
  // Remaining tickets: cycle through the demo actions for variety, so
  // dashboards have a realistic non-zero action count to summarize.
  for (let i = 3; i < tickets.length; i++) {
    const action = demoActions[i % demoActions.length];
    const performer = staff[i % staff.length];
    await prisma.actionTaken.create({
      data: { ticketId: tickets[i].id, performedById: performer.id, ...action },
    });
  }

  console.log(`Lab 4 seed: Actions Taken created across ${Math.max(0, tickets.length - 1)} of ${tickets.length} tickets (ticket #1 left with zero, for the empty-state test).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });