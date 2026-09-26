-- Cluster administrator only; inventory dependencies/memberships first.
-- psql -X -v ON_ERROR_STOP=1 -v legacy_role=barberflow -f lock-legacy-role.sql
BEGIN;
SELECT set_config('kortek.legacy_role', :'legacy_role', true);
DO $$
DECLARE
  target text := current_setting('kortek.legacy_role');
  target_oid oid;
BEGIN
  IF target = current_user OR target IN
    ('kortek_emergency_admin', 'kortek_runtime', 'kortek_migrator', 'kortek_backup')
  THEN RAISE EXCEPTION 'Refusing to lock an operational or current role'; END IF;
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
  THEN RAISE EXCEPTION 'Cluster administrator required'; END IF;
  SELECT oid INTO STRICT target_oid FROM pg_roles WHERE rolname = target;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid = target_oid)
  THEN RAISE EXCEPTION 'Legacy role has members: review before locking'; END IF;
  IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE usesysid = target_oid
             AND backend_type IN ('client backend', 'walsender'))
  THEN RAISE EXCEPTION 'Legacy sessions remain: review before locking'; END IF;
  EXECUTE format('ALTER ROLE %I NOLOGIN NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 0', target);
  -- PostgreSQL reserves OID 10 for the bootstrap superuser and forbids
  -- NOSUPERUSER on that role. Do not let this exception retain other attributes.
  IF target_oid = 10 THEN
    RAISE NOTICE 'Bootstrap SUPERUSER remains immutable; login and other elevated attributes revoked';
  ELSE
    EXECUTE format('ALTER ROLE %I NOSUPERUSER', target);
  END IF;
END $$;
SELECT rolname, oid, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls, rolconnlimit
FROM pg_roles WHERE rolname = current_setting('kortek.legacy_role');
COMMIT;
