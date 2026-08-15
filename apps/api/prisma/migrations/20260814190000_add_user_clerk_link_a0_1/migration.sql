-- Security A0.1 adds only the nullable external identity link.
-- PostgreSQL unique indexes allow multiple NULL values, so every existing
-- User remains unchanged and unlinked while non-NULL Clerk IDs are unique.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
