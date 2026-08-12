import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
// Hint: prisma.category.upsert({ where:{name}, update:{}, create:{name} }).
async function main() {
  const prisma = getPrisma();

  await prisma.category.upsert({ where: {name: "Account and Access"}, update: {}, create: {name: "Account and Access"} })
  await prisma.category.upsert({ where: {name: "Hardware"}, update: {}, create: {name: "Hardware" } })
  await prisma.category.upsert({ where: {name: "Software"}, update: {}, create: {name: "Software" } })
  await prisma.category.upsert({ where: {name: "Network"}, update: {}, create: {name: "Network" } })
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
