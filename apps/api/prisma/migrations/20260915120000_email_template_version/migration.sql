-- Deployment metadata is distinct from the consent notice version.
-- Do not invent a version for historical payloads.
ALTER TABLE "EmailOutbox" ADD COLUMN "templateVersion" TEXT;
