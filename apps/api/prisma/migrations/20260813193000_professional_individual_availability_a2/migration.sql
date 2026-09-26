CREATE TYPE "AvailabilityBlockStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "Organization"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Santo_Domingo';

CREATE TABLE "ProfessionalWeeklySchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalWeeklySchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProfessionalWeeklySchedule_day_check"
      CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    CONSTRAINT "ProfessionalWeeklySchedule_minutes_check"
      CHECK (
        "startMinute" BETWEEN 0 AND 1439
        AND "endMinute" BETWEEN 1 AND 1440
        AND "startMinute" < "endMinute"
      )
);

CREATE TABLE "ProfessionalAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityBlockStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalAvailabilityBlock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProfessionalAvailabilityBlock_range_check"
      CHECK ("startTime" < "endTime")
);

CREATE INDEX "ProfessionalSchedule_org_prof_day_idx"
ON "ProfessionalWeeklySchedule"("organizationId", "professionalId", "dayOfWeek");

CREATE INDEX "ProfessionalBlock_org_prof_status_start_idx"
ON "ProfessionalAvailabilityBlock"("organizationId", "professionalId", "status", "startTime");

CREATE INDEX "ProfessionalBlock_org_prof_end_idx"
ON "ProfessionalAvailabilityBlock"("organizationId", "professionalId", "endTime");

ALTER TABLE "ProfessionalWeeklySchedule"
ADD CONSTRAINT "ProfessionalWeeklySchedule_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalWeeklySchedule"
ADD CONSTRAINT "ProfessionalWeeklySchedule_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalAvailabilityBlock"
ADD CONSTRAINT "ProfessionalAvailabilityBlock_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalAvailabilityBlock"
ADD CONSTRAINT "ProfessionalAvailabilityBlock_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- btree_gist was enabled by checkpoint A0. This authoritative database
-- constraint prevents overlapping weekly shifts even under concurrent writes.
ALTER TABLE "ProfessionalWeeklySchedule"
ADD CONSTRAINT "ProfessionalWeeklySchedule_no_overlap"
EXCLUDE USING gist (
  "organizationId" WITH =,
  "professionalId" WITH =,
  "dayOfWeek" WITH =,
  int4range("startMinute", "endMinute", '[)') WITH &&
);
