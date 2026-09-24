-- Administrative, database-local setup AFTER migrations and a verified backup.
-- Does not set passwords: provision fresh secrets separately, never in Git.
-- The administrator remains available for recovery. No business rows change.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  role_name TEXT;
  object_record RECORD;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['kortek_runtime', 'kortek_migrator'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT', role_name);
    ELSE
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name
        AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
        OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = role_name)) THEN
        RAISE EXCEPTION 'Role setup blocked: existing application role has unexpected privileges or memberships';
      END IF;
    END IF;
  END LOOP;

  -- Scope ownership changes to this database and application schema only.
  -- REASSIGN OWNED is intentionally not used: it can affect shared objects.
  EXECUTE format('ALTER DATABASE %I OWNER TO kortek_migrator', current_database());
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO kortek_runtime', current_database());
  ALTER SCHEMA public OWNER TO kortek_migrator;
  REVOKE ALL ON SCHEMA public FROM PUBLIC;
  GRANT USAGE ON SCHEMA public TO kortek_runtime;

  FOR object_record IN
    SELECT c.relname, c.relkind FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass
        AND d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER %s public.%I OWNER TO kortek_migrator',
      CASE object_record.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END, object_record.relname);
  END LOOP;

  FOR object_record IN
    SELECT t.typname FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace AND t.typtype IN ('e', 'd')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass
        AND d.objid = t.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO kortek_migrator', object_record.typname);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, kortek_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kortek_runtime;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM kortek_runtime;
-- C1/C3 media contract is narrower than the historical default DML grants.
REVOKE DELETE ON public."MediaAsset", public."MediaGalleryOrder",
  public."MediaPromotion", public."MediaPurgeJob" FROM kortek_runtime;
REVOKE UPDATE, DELETE ON public."MediaOperation" FROM kortek_runtime;
GRANT USAGE ON TYPE public."MediaAssetPurpose", public."MediaAssetStatus",
  public."MediaModerationStatus" TO kortek_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, kortek_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kortek_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kortek_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kortek_runtime;
COMMIT;
