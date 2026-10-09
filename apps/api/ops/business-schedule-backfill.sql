-- Run only as part of an explicitly authorized transition. Never confirms existing or new schedules.
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
