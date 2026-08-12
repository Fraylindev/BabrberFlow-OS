CREATE TYPE "ProfessionalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

ALTER TABLE "Professional"
ADD COLUMN "status" "ProfessionalStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the previous operational/public behavior for existing records.
UPDATE "Professional"
SET
  "status" = CASE
    WHEN "isActive" THEN 'ACTIVE'::"ProfessionalStatus"
    ELSE 'INACTIVE'::"ProfessionalStatus"
  END,
  "isPublic" = "isActive";

ALTER TABLE "Professional" DROP COLUMN "isActive";

DROP INDEX "Professional_userId_key";

CREATE UNIQUE INDEX "Professional_organizationId_userId_key"
ON "Professional"("organizationId", "userId");

CREATE INDEX "Professional_organizationId_status_name_id_idx"
ON "Professional"("organizationId", "status", "name", "id");
