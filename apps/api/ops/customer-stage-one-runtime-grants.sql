-- M2 C3 P1: suplemento posterior a la migración 28. No modifica sus bytes.
-- Ejecutar como administrador/migrador, con backup aprobado, antes de activar API.
-- El runtime conserva UPDATE de Client: los triggers son SECURITY INVOKER.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_proc p WHERE p.oid IN
      ('public.customer_access_relink()'::regprocedure,
       'public.customer_booking_revision()'::regprocedure)
      AND NOT p.prosecdef AND p.prorettype = 'trigger'::regtype
      AND p.proowner = 'kortek_migrator'::regrole) <> 2 THEN
    RAISE EXCEPTION 'Customer trigger functions require migrator ownership and SECURITY INVOKER';
  END IF;
END $$;

REVOKE ALL ON TABLE public."CustomerOperation" FROM PUBLIC, kortek_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE public."CustomerOperation" TO kortek_runtime;
REVOKE ALL ON FUNCTION public.customer_access_relink(),
  public.customer_booking_revision() FROM PUBLIC, kortek_runtime;
GRANT EXECUTE ON FUNCTION public.customer_access_relink(),
  public.customer_booking_revision() TO kortek_runtime;
-- Fijar la resolución de Client al schema revisado, sin SECURITY DEFINER.
ALTER FUNCTION public.customer_access_relink()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.customer_booking_revision()
  SET search_path = pg_catalog, public, pg_temp;
COMMIT;
