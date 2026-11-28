-- Timbrino: collaborator entitlement and quota
-- Manual application script for the Lovable SQL Editor.
-- Reviewed against the read-only schema audit dated 2026-11-28.
--
-- IMPORTANT:
-- 1. Run only after taking a database backup / confirming the target project.
-- 2. Run the entire script in one execution. The transaction rolls back on error.
-- 3. This script does not modify Drizzle migrations or generated Supabase types.
-- 4. Do NOT run until the admin UI no longer calls admin_add_staff; that UI change must be deployed in the same release.
-- 5. After success, regenerate types using the project's supported workflow.
--
-- Behavior:
-- - New/existing venues default to disabled with a maximum of 5.
-- - Only platform admins can change the entitlement and maximum.
-- - Only venue owners can add/remove their collaborators.
-- - Additions are serialized by locking the venue row before counting.
-- - Existing collaborators remain; removal stays available when disabled.
-- - The old admin_add_staff RPC is disabled for authenticated clients.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.my_staff_settings()') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight: public.my_staff_settings() already exists; inspect it before proceeding';
  END IF;
  IF to_regprocedure('public.admin_get_staff_settings(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight: public.admin_get_staff_settings(uuid) already exists; inspect it before proceeding';
  END IF;
  IF to_regprocedure('public.admin_update_staff_settings(uuid,boolean,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight: public.admin_update_staff_settings(uuid,boolean,integer) already exists; inspect it before proceeding';
  END IF;
END
$preflight$;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS staff_management_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS staff_limit integer NOT NULL DEFAULT 5;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.venues'::regclass
      AND conname = 'venues_staff_limit_range'
  ) THEN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_staff_limit_range
      CHECK (staff_limit BETWEEN 1 AND 50);
  END IF;
END
$constraint$;

-- Owner-only read: never exposes another venue's settings.
CREATE FUNCTION public.my_staff_settings()
RETURNS TABLE(enabled boolean, staff_limit integer, staff_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Accedi';
  END IF;

  SELECT *
    INTO v
    FROM public.venues
   WHERE owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo il titolare può consultare le impostazioni dei collaboratori';
  END IF;

  RETURN QUERY
  SELECT
    v.staff_management_enabled,
    v.staff_limit,
    (SELECT count(*)::bigint
       FROM public.venue_staff s
      WHERE s.venue_id = v.id);
END
$function$;

-- Admin-only read for the platform administration panel.
CREATE FUNCTION public.admin_get_staff_settings(_venue uuid)
RETURNS TABLE(enabled boolean, staff_limit integer, staff_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v public.venues;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accesso riservato';
  END IF;

  SELECT *
    INTO v
    FROM public.venues
   WHERE id = _venue;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Locale non trovato';
  END IF;

  RETURN QUERY
  SELECT
    v.staff_management_enabled,
    v.staff_limit,
    (SELECT count(*)::bigint
       FROM public.venue_staff s
      WHERE s.venue_id = v.id);
END
$function$;

-- Admin-only entitlement configuration.
CREATE FUNCTION public.admin_update_staff_settings(
  _venue uuid,
  _enabled boolean,
  _staff_limit integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accesso riservato';
  END IF;

  IF _enabled IS NULL THEN
    RAISE EXCEPTION 'Stato autorizzazione non valido';
  END IF;

  IF _staff_limit IS NULL OR _staff_limit < 1 OR _staff_limit > 50 THEN
    RAISE EXCEPTION 'Il limite collaboratori deve essere compreso tra 1 e 50';
  END IF;

  PERFORM 1
    FROM public.venues
   WHERE id = _venue
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Locale non trovato';
  END IF;

  UPDATE public.venues
     SET staff_management_enabled = _enabled,
         staff_limit = _staff_limit
   WHERE id = _venue;
END
$function$;

-- Owner invitation: the venue row is the serialization lock for quota checks.
CREATE OR REPLACE FUNCTION public.add_staff(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v public.venues;
  u uuid;
  current_staff_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Accedi';
  END IF;

  SELECT *
    INTO v
    FROM public.venues
   WHERE owner_id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo il titolare può aggiungere collaboratori';
  END IF;

  IF NOT v.staff_management_enabled THEN
    RAISE EXCEPTION 'La gestione collaboratori non è abilitata per questo locale';
  END IF;

  SELECT au.id
    INTO u
    FROM auth.users au
   WHERE lower(au.email) = lower(trim(_email));

  IF u IS NULL THEN
    RAISE EXCEPTION 'Nessun account con questa email: il collaboratore deve prima registrarsi';
  END IF;

  IF u = auth.uid() THEN
    RAISE EXCEPTION 'Sei già il titolare';
  END IF;

  IF EXISTS (SELECT 1 FROM public.venues WHERE owner_id = u) THEN
    RAISE EXCEPTION 'Questo account è titolare di un altro locale';
  END IF;

  IF EXISTS (SELECT 1 FROM public.venue_staff WHERE user_id = u) THEN
    RAISE EXCEPTION 'Questo account collabora già con un locale';
  END IF;

  SELECT count(*)
    INTO current_staff_count
    FROM public.venue_staff
   WHERE venue_id = v.id;

  IF current_staff_count >= v.staff_limit THEN
    RAISE EXCEPTION 'Hai raggiunto il limite di % collaboratori', v.staff_limit;
  END IF;

  INSERT INTO public.venue_staff(venue_id, user_id, email)
  VALUES (v.id, u, lower(trim(_email)));
END
$function$;

-- Keep owner-scoped removal available even if collaborator management is disabled.
-- Restore authenticated EXECUTE, which was revoked by migration 0001.
REVOKE ALL ON FUNCTION public.add_staff(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_staff(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.remove_staff(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_staff(uuid) TO authenticated, service_role;

-- The admin panel will configure access, not add collaborators directly.
REVOKE ALL ON FUNCTION public.admin_add_staff(uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.my_staff_settings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_staff_settings() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_get_staff_settings(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_staff_settings(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_staff_settings(uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_settings(uuid, boolean, integer) TO authenticated, service_role;

COMMIT;

-- Post-run verification (execute separately after the transaction succeeds):
-- SELECT column_name, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'venues'
--   AND column_name IN ('staff_management_enabled', 'staff_limit')
-- ORDER BY column_name;
--
-- SELECT proname, prosecdef, proacl
-- FROM pg_proc
-- JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
-- WHERE n.nspname = 'public'
--   AND proname IN ('add_staff','remove_staff','admin_add_staff',
--                   'my_staff_settings','admin_get_staff_settings',
--                   'admin_update_staff_settings')
-- ORDER BY proname;
