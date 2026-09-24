-- Read-only verification, run connected AS the API runtime role.
BEGIN READ ONLY;
DO $$
BEGIN
  IF current_user <> 'kortek_runtime' THEN
    RAISE EXCEPTION 'Runtime verification requires the runtime connection';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = current_user
    AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls))
    OR pg_has_role(current_user, 'kortek_migrator', 'MEMBER')
    OR has_database_privilege(current_database(), 'CREATE')
    OR has_database_privilege(current_database(), 'TEMP')
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
END $$;
COMMIT;
