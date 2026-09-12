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
      update: {},
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
      update: {},
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });