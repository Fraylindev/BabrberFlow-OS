-- CreateEnum
CREATE TYPE "TeamInvitationStatus" AS ENUM (
  'CREATING',
  'PENDING',
  'RESENDING',
  'REVOKING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED',
  'FAILED'
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "createPublicProfile" BOOLEAN NOT NULL DEFAULT false,
  "status" "TeamInvitationStatus" NOT NULL DEFAULT 'CREATING',
  "clerkInvitationId" TEXT,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamInvitation_role_check"
    CHECK ("role" IN ('ADMIN', 'BARBER', 'RECEPTIONIST')),
  CONSTRAINT "TeamInvitation_public_profile_check"
    CHECK (NOT "createPublicProfile" OR "role" = 'BARBER')
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_clerkInvitationId_key"
  ON "TeamInvitation"("clerkInvitationId");

CREATE INDEX "TeamInvitation_organizationId_status_createdAt_id_idx"
  ON "TeamInvitation"("organizationId", "status", "createdAt", "id");

CREATE INDEX "TeamInvitation_organizationId_email_idx"
  ON "TeamInvitation"("organizationId", "email");

-- At most one invitation can be in an externally active transition for the
-- same tenant and normalized email. Historical terminal rows remain intact.
CREATE UNIQUE INDEX "TeamInvitation_one_open_per_org_email_key"
  ON "TeamInvitation"("organizationId", "email")
  WHERE "status" IN ('CREATING', 'PENDING', 'RESENDING', 'REVOKING');

-- AddForeignKey
ALTER TABLE "TeamInvitation"
  ADD CONSTRAINT "TeamInvitation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamInvitation"
  ADD CONSTRAINT "TeamInvitation_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamInvitation"
  ADD CONSTRAINT "TeamInvitation_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
