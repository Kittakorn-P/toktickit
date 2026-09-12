-- AlterTable
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";