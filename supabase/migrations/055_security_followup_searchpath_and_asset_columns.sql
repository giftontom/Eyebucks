-- 055_security_followup_searchpath_and_asset_columns.sql
-- Two security fixes surfaced by the adversarial critique of prior work.

-- ── 1. Re-pin search_path with pg_temp (completes 054) ───────────────────────
-- 054 set `search_path = public`, but Postgres searches pg_temp FIRST when it is
-- not named explicitly — so an unqualified `FROM users` in is_admin() can still
-- be shadowed by a session temp table. The project idiom (042, 035, apply_coupon)
-- is `public, pg_temp`, which pins pg_temp LAST so real public tables win. Match it.
-- Guarded loop: expire_enrollments sits behind CREATE EXTENSION pg_cron in 010,
-- absent from the local scratch DB but present in production; skip if absent.
DO $$
DECLARE fn text;
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
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping % — not present in this environment', fn;
    END;
  END LOOP;
END $$;

-- ── 2. Stop leaking private asset columns to public clients ──────────────────
-- digital_assets_select (039) exposes every PUBLISHED row to role `public`, and
-- anon/authenticated held column SELECT on storage_path (the R2 object key) and
-- external_url (a bearer link to the paid file — the Google-Drive delivery from
-- 048). RLS is row-level and cannot hide columns, so a crafted
--   supabase.from('digital_assets').select('storage_path,external_url')
-- with the public anon key returned both. The app never needs them on the
-- public path: storefront + admin read via explicit column lists
-- (STOREFRONT_COLUMNS / ADMIN_COLUMNS) that omit storage_path entirely, and
-- storage_path is only ever handled server-side by service_role edge functions
-- (which bypass column grants). external_url is read by the admin editor as
-- `authenticated`, so it is revoked from anon only here; closing it for
-- logged-in non-admins requires routing that read through a service_role path
-- (tracked as a follow-up) and is intentionally NOT done here to avoid breaking
-- the editor.
REVOKE SELECT (storage_path) ON public.digital_assets FROM anon, authenticated;
REVOKE SELECT (external_url)  ON public.digital_assets FROM anon;

-- Verify:
--   SELECT has_column_privilege('anon','public.digital_assets','storage_path','SELECT') AS anon_sp,     -- expect f
--          has_column_privilege('anon','public.digital_assets','external_url','SELECT')  AS anon_ext,    -- expect f
--          has_column_privilege('authenticated','public.digital_assets','storage_path','SELECT') AS au_sp; -- expect f
--   SELECT p.proname, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.proname IN ('is_admin','get_review_summary'); -- expect {search_path=public, pg_temp}
