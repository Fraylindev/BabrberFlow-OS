-- C1: schema and faithful legacy classification. Never confirms or publishes.
CREATE TYPE "BusinessScheduleState" AS ENUM ('UNCONFIRMED','LEGACY_UNCONFIRMED','CONFIRMED');
CREATE TABLE "BusinessSchedule" (
  "organizationId" TEXT NOT NULL PRIMARY KEY REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0),
  "state" "BusinessScheduleState" NOT NULL DEFAULT 'UNCONFIRMED',
  "zoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "legacyCategory" TEXT,
  "legacyOriginal" JSONB,
  "legacyPublicAllowed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "BusinessSchedule_confirmation_check" CHECK ("state" <> 'CONFIRMED' OR "zoneConfirmed"),
  CONSTRAINT "BusinessSchedule_category_check" CHECK ("legacyCategory" IS NULL OR "legacyCategory" IN ('SQL_NULL','JSON_NULL','VALID','INVALID'))
);
CREATE TABLE "BusinessScheduleDay" (
  "organizationId" TEXT NOT NULL REFERENCES "BusinessSchedule"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  PRIMARY KEY ("organizationId","dayOfWeek"),
  CONSTRAINT "BusinessScheduleDay_day_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6)
);
CREATE TABLE "BusinessScheduleWindow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  CONSTRAINT "BusinessScheduleWindow_day_fkey" FOREIGN KEY ("organizationId","dayOfWeek") REFERENCES "BusinessScheduleDay"("organizationId","dayOfWeek") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BusinessScheduleWindow_minutes_check" CHECK ("startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN 1 AND 1440 AND "startMinute" < "endMinute"),
  CONSTRAINT "BusinessScheduleWindow_no_overlap" EXCLUDE USING gist ("organizationId" WITH =,"dayOfWeek" WITH =,int4range("startMinute","endMinute",'[)') WITH &&)
);
CREATE INDEX "BusinessScheduleWindow_organizationId_dayOfWeek_startMinute_idx" ON "BusinessScheduleWindow"("organizationId","dayOfWeek","startMinute");
CREATE TABLE "BusinessClosure" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "BusinessSchedule"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "status" "AvailabilityBlockStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "BusinessClosure_range_check" CHECK ("startDate" <= "endDate" AND "startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN 1 AND 1440 AND "startMinute" < "endMinute" AND ("startDate" = "endDate" OR ("startMinute" = 0 AND "endMinute" = 1440))),
  CONSTRAINT "BusinessClosure_cancel_check" CHECK (("status" = 'ACTIVE' AND "cancelledAt" IS NULL) OR ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "BusinessClosure_id_organizationId_key" ON "BusinessClosure"("id","organizationId");
CREATE INDEX "BusinessClosure_organizationId_status_startDate_endDate_idx" ON "BusinessClosure"("organizationId","status","startDate","endDate");
CREATE TABLE "BusinessScheduleRevision" (
  "organizationId" TEXT NOT NULL REFERENCES "BusinessSchedule"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "actorUserId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","revision")
);

-- Deferred validation allows atomic replacement, but rejects incomplete confirmed weeks.
CREATE FUNCTION "validate_business_schedule"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tenant TEXT; BEGIN
  tenant := COALESCE(NEW."organizationId", OLD."organizationId");
  IF EXISTS (SELECT 1 FROM "BusinessScheduleWindow" WHERE "organizationId"=tenant GROUP BY "dayOfWeek" HAVING count(*)>5) THEN
    RAISE EXCEPTION 'Too many business windows' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM "BusinessSchedule" WHERE "organizationId"=tenant AND "state"='CONFIRMED')
    AND (SELECT count(*) FROM "BusinessScheduleDay" WHERE "organizationId"=tenant)<>7 THEN
    RAISE EXCEPTION 'Incomplete confirmed business week' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "BusinessSchedule_complete_week" AFTER INSERT OR UPDATE ON "BusinessSchedule" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "validate_business_schedule"();
CREATE CONSTRAINT TRIGGER "BusinessScheduleDay_complete_week" AFTER INSERT OR UPDATE OR DELETE ON "BusinessScheduleDay" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "validate_business_schedule"();
CREATE CONSTRAINT TRIGGER "BusinessScheduleWindow_limit" AFTER INSERT OR UPDATE OR DELETE ON "BusinessScheduleWindow" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "validate_business_schedule"();

-- Executable backfill is maintained separately for idempotence verification.
INSERT INTO "BusinessSchedule" ("organizationId","state","legacyCategory","legacyOriginal","legacyPublicAllowed")
SELECT o."id",'LEGACY_UNCONFIRMED',
 CASE WHEN o."businessHours" IS NULL THEN 'SQL_NULL'
 WHEN o."businessHours"='null'::jsonb THEN 'JSON_NULL'
 WHEN jsonb_typeof(o."businessHours")='object'
 AND o."businessHours"->>'open' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 AND o."businessHours"->>'close' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 AND o."businessHours"->>'open' < o."businessHours"->>'close' THEN 'VALID' ELSE 'INVALID' END,
 o."businessHours",COALESCE(c."isPublished" AND c."publishedSnapshot" IS NOT NULL,false)
FROM "Organization" o LEFT JOIN "CmsPage" c ON c."organizationId"=o."id"
ON CONFLICT ("organizationId") DO NOTHING;

DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='kortek_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON "BusinessSchedule","BusinessClosure" TO kortek_runtime;
  GRANT SELECT,INSERT,DELETE ON "BusinessScheduleDay","BusinessScheduleWindow" TO kortek_runtime;
  GRANT SELECT,INSERT ON "BusinessScheduleRevision" TO kortek_runtime;
  GRANT USAGE ON TYPE "BusinessScheduleState" TO kortek_runtime;
 END IF;
END $$;
