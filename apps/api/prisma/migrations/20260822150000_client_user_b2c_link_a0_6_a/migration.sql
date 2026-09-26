-- AlterTable
ALTER TABLE "Client" ADD COLUMN "userId" TEXT;

-- A B2C identity can own at most one Client record per tenant. PostgreSQL
-- permits multiple NULL values, so existing and unclaimed clients are kept.
CREATE UNIQUE INDEX "Client_organizationId_userId_key"
  ON "Client"("organizationId", "userId");

-- Preserve the business history if an identity is ever removed.
ALTER TABLE "Client"
  ADD CONSTRAINT "Client_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
