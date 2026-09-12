-- Rename RequesterUser -> User, add auth/role columns
ALTER TABLE "RequesterUser" RENAME TO "User";

CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add Ticket.ownerId (nullable FK)
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- Add itPriority: nullable first, backfill, THEN enforce NOT NULL (this is the fix
-- for the "74 rows, no default" failure)
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "Priority";
UPDATE "Ticket" SET "itPriority" = "requestedPriority";
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- Expand TicketStatus enum (safe additive change)
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- Comment table
CREATE TABLE "Comment" (
    "id" SERIAL PRIMARY KEY,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Comment_ticketId_idx" ON "Comment"("ticketId");

-- Note table
CREATE TABLE "Note" (
    "id" SERIAL PRIMARY KEY,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Note" ADD CONSTRAINT "Note_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Note_ticketId_idx" ON "Note"("ticketId");