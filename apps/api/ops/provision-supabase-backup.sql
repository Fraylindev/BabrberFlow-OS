-- Run as Supabase postgres administrator after application roles exist.
-- Assign the independent password out of band, never in this file.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kortek_backup') THEN
    RAISE EXCEPTION 'Backup role already exists; inspect before retry';
  END IF;
  CREATE ROLE kortek_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOREPLICATION NOBYPASSRLS NOINHERIT;
END $$;
GRANT CONNECT ON DATABASE postgres TO kortek_backup;
GRANT USAGE ON SCHEMA public TO kortek_backup;
COMMIT;
