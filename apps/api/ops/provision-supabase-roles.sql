-- Supabase Free/PostgreSQL 17: run on a NEW, empty project as its postgres
-- administrator BEFORE pg_restore. Passwords are assigned separately.
-- Do not alter ownership of Supabase's postgres database or public schema.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'Supabase provisioning requires empty public schema';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('kortek_migrator','kortek_runtime')) THEN
    RAISE EXCEPTION 'Application roles already exist; inspect before retry';
  END IF;
  CREATE ROLE kortek_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOREPLICATION NOBYPASSRLS NOINHERIT;
  CREATE ROLE kortek_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOREPLICATION NOBYPASSRLS NOINHERIT;
END $$;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
GRANT CONNECT ON DATABASE postgres TO kortek_migrator, kortek_runtime;
GRANT USAGE, CREATE ON SCHEMA public TO kortek_migrator;
GRANT USAGE ON SCHEMA public TO kortek_runtime;
COMMIT;

-- Then set distinct strong passwords out of band, restore --no-owner
-- --no-acl as kortek_migrator with the public schema TOC line disabled,
-- run finish-supabase-grants.sql AS kortek_migrator, and verify as runtime.
