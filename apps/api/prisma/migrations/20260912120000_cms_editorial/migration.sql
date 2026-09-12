BEGIN;
-- Evita altas entre la captura de compatibilidad y el trigger de alta nueva.
LOCK TABLE "Organization" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE "CmsPage" (
  "organizationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "draftRevision" INTEGER NOT NULL DEFAULT 0,
  "draft" JSONB NOT NULL,
  "publishedSnapshot" JSONB,
  "publishedRevision" INTEGER,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "CmsPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CmsPage_revisions_check" CHECK ("version" >= 0 AND "draftRevision" >= 0 AND "draftRevision" <= "version" AND ("publishedRevision" IS NULL OR ("publishedRevision" >= 0 AND "publishedRevision" <= "draftRevision"))),
  CONSTRAINT "CmsPage_publication_check" CHECK (("publishedSnapshot" IS NULL) = ("publishedRevision" IS NULL) AND (NOT "isPublished" OR "publishedSnapshot" IS NOT NULL)),
  CONSTRAINT "CmsPage_content_check" CHECK (jsonb_typeof("draft") = 'object' AND ("publishedSnapshot" IS NULL OR jsonb_typeof("publishedSnapshot") = 'object'))
);

CREATE TABLE "CmsOperation" (
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "publishedRevision" INTEGER,
  "isPublished" BOOLEAN NOT NULL,
  CONSTRAINT "CmsOperation_pkey" PRIMARY KEY ("organizationId", "actorUserId", "key"),
  CONSTRAINT "CmsOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CmsPage"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CmsOperation_operation_check" CHECK ("operation" IN ('SAVE_DRAFT', 'PUBLISH', 'UNPUBLISH'))
);

-- BEGIN COMPATIBILITY BACKFILL
-- Reproducible: no sobreescribe borradores, recibos o retiradas existentes.
-- Solo filas existentes en esta frontera transaccional; no copia columnas privadas.
INSERT INTO "CmsPage" ("organizationId", "draft", "publishedSnapshot", "publishedRevision", "isPublished")
SELECT "id", content, content, 0, true
FROM "Organization", LATERAL (
  SELECT jsonb_build_object('publicName', "name", 'phone', "phone", 'description', NULL, 'address', NULL, 'googleMapsUrl', NULL) AS content
) public_compatibility
ON CONFLICT ("organizationId") DO NOTHING;
-- END COMPATIBILITY BACKFILL

-- Toda alta (Clerk, legacy u otra escritura autorizada) nace sin publicar.
CREATE FUNCTION cms_initialize_unpublished() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "CmsPage" ("organizationId", "draft") VALUES (
    NEW."id", jsonb_build_object('publicName', NEW."name", 'phone', NEW."phone", 'description', NULL, 'address', NULL, 'googleMapsUrl', NULL)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Organization_initialize_cms" AFTER INSERT ON "Organization"
FOR EACH ROW EXECUTE FUNCTION cms_initialize_unpublished();
COMMIT;
