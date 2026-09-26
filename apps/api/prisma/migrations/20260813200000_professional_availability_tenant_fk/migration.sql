ALTER TABLE "Professional"
ADD CONSTRAINT "Professional_id_organizationId_key"
UNIQUE ("id", "organizationId");

ALTER TABLE "ProfessionalWeeklySchedule"
DROP CONSTRAINT "ProfessionalWeeklySchedule_professionalId_fkey";

ALTER TABLE "ProfessionalWeeklySchedule"
ADD CONSTRAINT "ProfessionalWeeklySchedule_professionalId_fkey"
FOREIGN KEY ("professionalId", "organizationId")
REFERENCES "Professional"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalAvailabilityBlock"
DROP CONSTRAINT "ProfessionalAvailabilityBlock_professionalId_fkey";

ALTER TABLE "ProfessionalAvailabilityBlock"
ADD CONSTRAINT "ProfessionalAvailabilityBlock_professionalId_fkey"
FOREIGN KEY ("professionalId", "organizationId")
REFERENCES "Professional"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
