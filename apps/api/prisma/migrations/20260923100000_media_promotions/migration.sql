-- CreateEnum
CREATE TYPE "MediaAssetPurpose" AS ENUM ('GALLERY', 'SERVICE', 'PROFESSIONAL_AVATAR', 'PROMOTION');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('STAGED', 'APPROVED', 'PUBLISHED', 'QUARANTINED', 'RETIRED', 'PURGED');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purpose" "MediaAssetPurpose" NOT NULL,
    "targetId" TEXT,
    "cloudAssetId" TEXT,
    "cloudPublicId" TEXT,
    "cloudVersion" INTEGER,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'STAGED',
    "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "publishedRevision" INTEGER,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "decorative" BOOLEAN NOT NULL DEFAULT false,
    "publishedAltText" TEXT,
    "publishedCaption" TEXT,
    "publishedDecorative" BOOLEAN,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "quarantinedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "stagingExpiresAt" TIMESTAMP(3) NOT NULL,
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGalleryOrder" (
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "draftRevision" INTEGER NOT NULL DEFAULT 0,
    "draftAssetIds" JSONB NOT NULL,
    "draftHeroAssetId" TEXT,
    "publishedRevision" INTEGER,
    "publishedAssetIds" JSONB,
    "publishedHeroAssetId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaGalleryOrder_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "MediaPromotion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "draftRevision" INTEGER NOT NULL DEFAULT 1,
    "draftTitle" TEXT NOT NULL,
    "draftBody" TEXT NOT NULL,
    "draftStartDate" TEXT NOT NULL,
    "draftEndDate" TEXT NOT NULL,
    "imageAssetId" TEXT,
    "publishedRevision" INTEGER,
    "publishedTitle" TEXT,
    "publishedBody" TEXT,
    "publishedImageAssetId" TEXT,
    "timeZone" TEXT,
    "startsAtUtc" TIMESTAMP(3),
    "endsAtUtc" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPurgeJob" (
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPurgeJob_pkey" PRIMARY KEY ("assetId")
);

-- CreateTable
CREATE TABLE "MediaOperation" (
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resultRevision" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaOperation_pkey" PRIMARY KEY ("organizationId","actorUserId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_cloudAssetId_key" ON "MediaAsset"("cloudAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_cloudPublicId_key" ON "MediaAsset"("cloudPublicId");

-- CreateIndex
CREATE INDEX "MediaAsset_organizationId_status_purpose_targetId_idx" ON "MediaAsset"("organizationId", "status", "purpose", "targetId");

-- CreateIndex
CREATE INDEX "MediaAsset_organizationId_stagingExpiresAt_idx" ON "MediaAsset"("organizationId", "stagingExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_organizationId_id_key" ON "MediaAsset"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPromotion_imageAssetId_key" ON "MediaPromotion"("imageAssetId");

-- CreateIndex
CREATE INDEX "MediaPromotion_organizationId_isPublished_startsAtUtc_endsA_idx" ON "MediaPromotion"("organizationId", "isPublished", "startsAtUtc", "endsAtUtc");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPromotion_organizationId_imageAssetId_key" ON "MediaPromotion"("organizationId", "imageAssetId");

-- CreateIndex
CREATE INDEX "MediaPurgeJob_nextAttemptAt_completedAt_idx" ON "MediaPurgeJob"("nextAttemptAt", "completedAt");

-- CreateIndex
CREATE INDEX "MediaPurgeJob_organizationId_completedAt_idx" ON "MediaPurgeJob"("organizationId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPurgeJob_organizationId_assetId_key" ON "MediaPurgeJob"("organizationId", "assetId");

-- CreateIndex
CREATE INDEX "MediaOperation_organizationId_resourceId_idx" ON "MediaOperation"("organizationId", "resourceId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGalleryOrder" ADD CONSTRAINT "MediaGalleryOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPromotion" ADD CONSTRAINT "MediaPromotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPromotion" ADD CONSTRAINT "MediaPromotion_organizationId_imageAssetId_fkey" FOREIGN KEY ("organizationId", "imageAssetId") REFERENCES "MediaAsset"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPurgeJob" ADD CONSTRAINT "MediaPurgeJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPurgeJob" ADD CONSTRAINT "MediaPurgeJob_organizationId_assetId_fkey" FOREIGN KEY ("organizationId", "assetId") REFERENCES "MediaAsset"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaOperation" ADD CONSTRAINT "MediaOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source-of-truth deactivation guards also cover older service writers.
-- Provider deletion is queued in the same transaction; the public DB gate closes immediately.
CREATE FUNCTION media_quarantine_service_images() RETURNS trigger AS $$
DECLARE affected RECORD;
BEGIN
  IF TG_OP = 'DELETE' OR (OLD."isActive" = true AND NEW."isActive" = false) THEN
    FOR affected IN
      UPDATE "MediaAsset"
      SET "status" = 'QUARANTINED', "targetId" = NULL,
          "quarantinedAt" = CURRENT_TIMESTAMP, "purgeAfter" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = OLD."organizationId"
        AND "purpose" = 'SERVICE' AND "targetId" = OLD."id"
        AND "status" IN ('STAGED', 'APPROVED', 'PUBLISHED')
      RETURNING "id"
    LOOP
      INSERT INTO "MediaPurgeJob" ("assetId", "organizationId", "nextAttemptAt")
      VALUES (affected."id", OLD."organizationId", CURRENT_TIMESTAMP)
      ON CONFLICT ("assetId") DO UPDATE
        SET "nextAttemptAt" = CURRENT_TIMESTAMP, "completedAt" = NULL;
    END LOOP;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_service_offline
AFTER UPDATE OF "isActive" OR DELETE ON "Service"
FOR EACH ROW EXECUTE FUNCTION media_quarantine_service_images();

CREATE FUNCTION media_quarantine_professional_avatar() RETURNS trigger AS $$
DECLARE affected RECORD;
BEGIN
  IF TG_OP = 'DELETE' OR
     (OLD."status" <> 'ARCHIVED' AND NEW."status" = 'ARCHIVED') OR
     (OLD."isPublic" = true AND NEW."isPublic" = false) THEN
    FOR affected IN
      UPDATE "MediaAsset"
      SET "status" = 'QUARANTINED', "targetId" = NULL,
          "quarantinedAt" = CURRENT_TIMESTAMP, "purgeAfter" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = OLD."organizationId"
        AND "purpose" = 'PROFESSIONAL_AVATAR' AND "targetId" = OLD."id"
        AND "status" IN ('STAGED', 'APPROVED', 'PUBLISHED')
      RETURNING "id"
    LOOP
      INSERT INTO "MediaPurgeJob" ("assetId", "organizationId", "nextAttemptAt")
      VALUES (affected."id", OLD."organizationId", CURRENT_TIMESTAMP)
      ON CONFLICT ("assetId") DO UPDATE
        SET "nextAttemptAt" = CURRENT_TIMESTAMP, "completedAt" = NULL;
    END LOOP;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_professional_offline
AFTER UPDATE OF "status", "isPublic" OR DELETE ON "Professional"
FOR EACH ROW EXECUTE FUNCTION media_quarantine_professional_avatar();

-- Soft deletion/inactivation never leaves a published media reference behind.
CREATE FUNCTION media_retire_inactive_organization() RETURNS trigger AS $$
DECLARE affected RECORD;
BEGIN
  IF (NEW."isActive" = false OR NEW."deletedAt" IS NOT NULL)
     AND (OLD."isActive" = true AND OLD."deletedAt" IS NULL) THEN
    UPDATE "MediaPromotion"
    SET "isPublished" = false, "retiredAt" = CURRENT_TIMESTAMP,
        "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "organizationId" = NEW."id" AND "retiredAt" IS NULL;
    FOR affected IN
      UPDATE "MediaAsset"
      SET "status" = 'RETIRED', "retiredAt" = CURRENT_TIMESTAMP,
          "purgeAfter" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = NEW."id" AND "status" <> 'PURGED'
      RETURNING "id"
    LOOP
      INSERT INTO "MediaPurgeJob" ("assetId", "organizationId", "nextAttemptAt")
      VALUES (affected."id", NEW."id", CURRENT_TIMESTAMP)
      ON CONFLICT ("assetId") DO UPDATE
        SET "nextAttemptAt" = CURRENT_TIMESTAMP, "completedAt" = NULL;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_organization_offline
AFTER UPDATE OF "isActive", "deletedAt" ON "Organization"
FOR EACH ROW EXECUTE FUNCTION media_retire_inactive_organization();

-- The operational runtime role is provisioned outside migrations. Grant only
-- the DML needed by media services/workers and deactivation triggers when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kortek_runtime') THEN
    GRANT USAGE ON TYPE "MediaAssetPurpose", "MediaAssetStatus", "MediaModerationStatus" TO kortek_runtime;
    GRANT SELECT, INSERT, UPDATE ON "MediaAsset", "MediaGalleryOrder", "MediaPromotion", "MediaPurgeJob" TO kortek_runtime;
    GRANT SELECT, INSERT ON "MediaOperation" TO kortek_runtime;
  END IF;
END;
$$;
