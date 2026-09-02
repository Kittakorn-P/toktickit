import { getPrisma } from "../src/prisma.js";

const prisma = getPrisma();

async function main() {
  // Categories — 4 required, upsert keeps this safe to re-run
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Related Systems — at least 6 required
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Development Requesters — at least 4 active, at least 1 inactive
  const requesters: { name: string; email: string; isActive: boolean }[] = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", isActive: true },
    { name: "Inactive Ida", email: "inactive.ida@example.com", isActive: false },
  ];
  for (const r of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }

  console.log("Lab 2 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });