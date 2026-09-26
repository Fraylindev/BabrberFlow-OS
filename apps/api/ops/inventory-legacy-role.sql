-- Run as a cluster administrator in every connectable database with
-- psql -X -v ON_ERROR_STOP=1 -v legacy_role=barberflow -f ...
-- Read only: no business rows or secrets are selected.
BEGIN READ ONLY;
SELECT current_database() AS database, r.rolname, r.rolcanlogin,
       r.rolsuper, r.rolcreatedb, r.rolcreaterole,
       r.rolreplication, r.rolbypassrls
FROM pg_roles r WHERE r.rolname = :'legacy_role';

SELECT d.datname AS database, pg_get_userbyid(d.datdba) AS owner,
       d.datallowconn, d.datacl
FROM pg_database d
WHERE d.datdba = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
   OR d.datacl::text LIKE '%' || :'legacy_role' || '%'
ORDER BY d.datname;

SELECT t.spcname AS tablespace, pg_get_userbyid(t.spcowner) AS owner, t.spcacl
FROM pg_tablespace t
WHERE t.spcowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
   OR t.spcacl::text LIKE '%' || :'legacy_role' || '%';

SELECT member.rolname AS member, parent.rolname AS granted_role,
       grantor.rolname AS grantor, m.admin_option, m.inherit_option,
       m.set_option
FROM pg_auth_members m
JOIN pg_roles member ON member.oid = m.member
JOIN pg_roles parent ON parent.oid = m.roleid
JOIN pg_roles grantor ON grantor.oid = m.grantor
WHERE member.rolname = :'legacy_role' OR parent.rolname = :'legacy_role'
   OR grantor.rolname = :'legacy_role';

SELECT 'schema' AS kind, n.nspname AS object, pg_get_userbyid(n.nspowner) AS owner,
       n.nspacl::text AS acl
FROM pg_namespace n
WHERE n.nspname !~ '^(pg_|information_schema$)'
  AND (n.nspowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
    OR n.nspacl::text LIKE '%' || :'legacy_role' || '%')
UNION ALL
SELECT 'relation', n.nspname || '.' || c.relname,
       pg_get_userbyid(c.relowner), c.relacl::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname !~ '^(pg_|information_schema$)'
  AND (c.relowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
    OR c.relacl::text LIKE '%' || :'legacy_role' || '%')
UNION ALL
SELECT 'type', n.nspname || '.' || t.typname,
       pg_get_userbyid(t.typowner), t.typacl::text
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname !~ '^(pg_|information_schema$)'
  AND (t.typowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
    OR t.typacl::text LIKE '%' || :'legacy_role' || '%')
UNION ALL
SELECT 'function', n.nspname || '.' || p.proname || '(' ||
       pg_get_function_identity_arguments(p.oid) || ')',
       pg_get_userbyid(p.proowner), p.proacl::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname !~ '^(pg_|information_schema$)'
  AND (p.proowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
    OR p.proacl::text LIKE '%' || :'legacy_role' || '%')
UNION ALL
SELECT 'extension', e.extname, pg_get_userbyid(e.extowner), NULL
FROM pg_extension e
WHERE e.extowner = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
ORDER BY kind, object;

SELECT pg_get_userbyid(a.defaclrole) AS grantor,
       COALESCE(n.nspname, '<global>') AS schema,
       a.defaclobjtype AS object_type,
       a.defaclacl
FROM pg_default_acl a
LEFT JOIN pg_namespace n ON n.oid = a.defaclnamespace
WHERE a.defaclrole = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
   OR a.defaclacl::text LIKE '%' || :'legacy_role' || '%';

-- Pinned bootstrap dependencies are not all recorded in pg_shdepend. Enumerate
-- every catalog's owner OID column, including system schemas and object kinds
-- such as operators, collations, publications and large objects. Addresses only:
-- never SELECT complete catalog rows (subscriptions can contain credentials).
SELECT format(
  'SELECT %L AS kind, %L AS catalog, %L AS owner_column, oid AS object_oid FROM pg_catalog.%I WHERE %I = %s ORDER BY oid',
  'catalog-owner', c.relname, a.attname, c.relname, a.attname, r.oid
)
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
CROSS JOIN pg_roles r
WHERE c.relnamespace = 'pg_catalog'::regnamespace
  AND c.relkind = 'r'
  AND a.attnum > 0 AND NOT a.attisdropped
  AND a.atttypid = 'oid'::regtype
  AND (a.attname ~ 'owner$' OR a.attname = 'datdba')
  AND EXISTS (SELECT 1 FROM pg_attribute object_id
    WHERE object_id.attrelid = c.oid AND object_id.attname = 'oid'
      AND object_id.attnum > 0 AND NOT object_id.attisdropped)
  AND r.rolname = :'legacy_role'
ORDER BY c.relname, a.attname
\gexec

SELECT d.dbid, d.classid::regclass AS catalog, d.objid, d.deptype
FROM pg_shdepend d
WHERE d.refclassid = 'pg_authid'::regclass
  AND d.refobjid = (SELECT oid FROM pg_roles WHERE rolname = :'legacy_role')
ORDER BY d.dbid, d.classid::regclass::text, d.objid;
COMMIT;
