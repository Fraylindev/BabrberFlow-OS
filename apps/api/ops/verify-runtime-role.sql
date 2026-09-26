-- Read-only verification, run connected AS the API runtime role.
BEGIN READ ONLY;
DO $$
DECLARE
  object_record RECORD;
  privilege_name TEXT;
  expected BOOLEAN;
  actual BOOLEAN;
BEGIN
  IF current_user <> 'kortek_runtime' THEN
    RAISE EXCEPTION 'Runtime verification requires the runtime connection';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = current_user
    AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls))
    OR EXISTS (SELECT 1 FROM pg_auth_members
      WHERE member = (SELECT oid FROM pg_roles WHERE rolname = current_user))
    OR has_database_privilege(current_database(), 'CREATE')
    OR (has_database_privilege(current_database(), 'TEMP')
      AND NOT (current_database() = 'postgres'
        AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault')))
    OR has_schema_privilege('public', 'CREATE') THEN
    RAISE EXCEPTION 'Runtime has administrative or DDL privileges';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace
    AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)) THEN
    RAISE EXCEPTION 'Runtime must not own schema objects';
  END IF;
  IF has_table_privilege('public."_prisma_migrations"', 'SELECT')
    OR has_table_privilege('public."Invoice"', 'TRUNCATE')
    OR has_table_privilege('public."Invoice"', 'TRIGGER') THEN
    RAISE EXCEPTION 'Runtime has unnecessary table privileges';
  END IF;
  IF NOT has_table_privilege('public."Invoice"', 'SELECT')
    OR NOT has_table_privilege('public."Invoice"', 'INSERT')
    OR NOT has_table_privilege('public."Membership"', 'UPDATE')
    OR NOT has_table_privilege('public."Membership"', 'DELETE') THEN
    RAISE EXCEPTION 'Runtime lacks required application privileges';
  END IF;
  IF NOT has_table_privilege('public."MediaAsset"', 'SELECT')
    OR NOT has_table_privilege('public."MediaAsset"', 'INSERT')
    OR NOT has_table_privilege('public."MediaAsset"', 'UPDATE')
    OR NOT has_table_privilege('public."MediaOperation"', 'SELECT')
    OR NOT has_table_privilege('public."MediaOperation"', 'INSERT')
    OR NOT has_type_privilege('public."MediaAssetPurpose"', 'USAGE')
    OR NOT has_type_privilege('public."MediaAssetStatus"', 'USAGE')
    OR NOT has_type_privilege('public."MediaModerationStatus"', 'USAGE') THEN
    RAISE EXCEPTION 'Runtime lacks required media privileges';
  END IF;
  IF has_table_privilege('public."MediaOperation"', 'UPDATE')
    OR has_table_privilege('public."MediaOperation"', 'DELETE')
    OR has_table_privilege('public."MediaAsset"', 'DELETE')
    OR has_table_privilege('public."MediaGalleryOrder"', 'DELETE')
    OR has_table_privilege('public."MediaPromotion"', 'DELETE')
    OR has_table_privilege('public."MediaPurgeJob"', 'DELETE') THEN
    RAISE EXCEPTION 'Runtime exceeds media contract privileges';
  END IF;

  -- Exact 26-migration baseline. New tables fail this gate until their
  -- migration declares grants and the reviewed matrix is updated.
  FOR object_record IN
    SELECT c.oid, c.relname, m.allowed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN (VALUES
      ('AuditLog','SI'), ('Booking','SIU'), ('BookingEmailEvent','SI'),
      ('BookingEmailPreference','SIU'), ('Client','SIU'),
      ('CmsOperation','SI'), ('CmsPage','SIU'), ('EmailAbuseBucket','SIUD'),
      ('EmailChannelControl','SIU'), ('EmailOutbox','SIU'),
      ('EmailWebhookReceipt','SI'), ('GalleryImage','S'), ('Invoice','SI'),
      ('MediaAsset','SIU'), ('MediaGalleryOrder','SIU'),
      ('MediaOperation','SI'), ('MediaPromotion','SIU'),
      ('MediaPurgeJob','SIU'), ('Membership','SIUD'), ('Notification','S'),
      ('Organization','SIU'), ('Payment','SI'), ('Professional','SIU'),
      ('ProfessionalAvailabilityBlock','SIU'), ('ProfessionalService','SIU'),
      ('ProfessionalWeeklySchedule','SIUD'), ('SecurityRateBucket','SIUD'),
      ('Service','SIU'),
      ('TeamInvitation','SIU'), ('User','SIU'), ('_prisma_migrations','')
    ) AS m(relname, allowed) ON m.relname = c.relname
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    IF object_record.allowed IS NULL THEN
      RAISE EXCEPTION 'Unreviewed public table: %', object_record.relname;
    END IF;
    FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      expected := position(left(privilege_name, 1) IN object_record.allowed) > 0;
      actual := has_table_privilege(object_record.oid, privilege_name);
      IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Unexpected runtime privilege on %: %',
          object_record.relname, privilege_name;
      END IF;
    END LOOP;
    FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF has_table_privilege(object_record.oid, privilege_name) THEN
        RAISE EXCEPTION 'Unexpected runtime privilege on %: %',
          object_record.relname, privilege_name;
      END IF;
    END LOOP;
    -- MAINTAIN was added in PostgreSQL 17; CI can still verify older servers.
    IF current_setting('server_version_num')::integer >= 170000 THEN
      IF has_table_privilege(object_record.oid, 'MAINTAIN') THEN
        RAISE EXCEPTION 'Unexpected runtime privilege on %: MAINTAIN',
          object_record.relname;
      END IF;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p')) <> 31 THEN
    RAISE EXCEPTION 'Public table matrix is incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_default_acl a, aclexplode(a.defaclacl) acl
    WHERE a.defaclrole = 'kortek_migrator'::regrole
      AND a.defaclobjtype = 'r'
      AND acl.grantee IN (0, 'kortek_runtime'::regrole)
  ) THEN
    RAISE EXCEPTION 'Runtime or PUBLIC has default table privileges';
  END IF;
END $$;
COMMIT;
