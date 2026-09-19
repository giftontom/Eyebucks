-- 054_pin_function_search_path.sql
-- Security hardening: pin search_path on the remaining SECURITY DEFINER functions.
--
-- A live security audit (Supabase's "Function Search Path Mutable" advisor)
-- flagged six SECURITY DEFINER functions whose search_path is caller-controlled:
--   is_admin, prevent_role_change, handle_new_user, handle_user_login,
--   expire_enrollments, get_review_summary
--
-- A SECURITY DEFINER function that trusts the caller's search_path is the
-- classic privilege-escalation vector: a caller can prepend a schema they can
-- write to and shadow an unqualified reference (a table or a built-in) the
-- function relies on, running their object with the definer's rights. is_admin()
-- is the worst case — it backs every RLS policy in the database.
--
-- The 042 hardening and 051 already pin search_path on the functions they
-- touch; these six predate that and were missed. Each references only
-- public-schema objects unqualified (users, enrollments, reviews, is_admin) plus
-- schema-qualified auth.uid()/public.users and built-ins, so pinning to `public`
-- is behaviour-preserving — it only removes the caller's ability to change how
-- those names resolve. Bodies are left exactly as they are.
--
-- Guarded per function: expire_enrollments lives in 010 behind a
-- `CREATE EXTENSION pg_cron` that the local verify-migrations.sh scratch DB
-- cannot run (pg_cron is Supabase-managed), so that function is absent there
-- while present in production. Rather than fail the local replay, skip a
-- genuinely-absent function and pin the rest. Idempotent: ALTER ... SET is
-- declarative, so re-running is a no-op. Verify the outcome with the advisor
-- query at the bottom (must return zero rows).
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.is_admin()',
    'public.prevent_role_change()',
    'public.handle_new_user()',
    'public.handle_user_login()',
    'public.expire_enrollments()',
    'public.get_review_summary(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping % — not present in this environment', fn;
    END;
  END LOOP;
END $$;

-- Verify (must return zero rows once applied to a full environment):
--   SELECT p.proname
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.prosecdef
--      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%');
