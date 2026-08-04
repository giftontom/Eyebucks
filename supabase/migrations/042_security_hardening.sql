-- Migration: 042_security_hardening
-- Description: Security hotfix for four verified gaps:
--              (1) apply_coupon (018) had default PUBLIC EXECUTE — any authenticated
--                  user could redeem/burn coupon uses directly, bypassing the
--                  coupon-apply Edge Function. Locked to service_role only.
--              (2) "Users read active coupons" policy (017) let any authenticated
--                  user SELECT * FROM coupons — full coupon-code enumeration.
--              (3) set_bundle_courses (014): SECURITY DEFINER, no admin gate,
--                  PUBLIC EXECUTE — any authenticated user could rewrite bundles.
--              (4) reorder_modules (014): same class — any authenticated user
--                  could reorder any course's modules.
--              (5) reorder_lessons (034): same class — SECURITY DEFINER with
--                  GRANT authenticated but no admin gate in the body.
-- Created: 2026-08-04

-- ============================================
-- 1. apply_coupon — service_role only
-- ============================================
-- Sole caller is the coupon-apply Edge Function via the service-role admin client
-- (supabase/functions/coupon-apply/index.ts). No frontend supabase.rpc() call
-- exists, so `authenticated` gets NO grant — mirrors apply_asset_coupon (040).
-- The explicit role REVOKEs cover any direct default-privilege grants in addition
-- to the PUBLIC umbrella (REVOKE FROM a role that has no direct grant is a no-op).
REVOKE EXECUTE ON FUNCTION public.apply_coupon(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_coupon(TEXT, UUID, TEXT) TO service_role;

-- Cheap search_path pinning without replacing the body (body rewrite is a
-- separate workstream); prevents search_path hijack of its unqualified refs.
ALTER FUNCTION public.apply_coupon(TEXT, UUID, TEXT) SET search_path = public, pg_temp;

-- apply_asset_coupon — same lockdown. 040 wrote `REVOKE ... FROM PUBLIC` but a
-- LIVE has_function_privilege() check on the remote DB (2026-08-04) shows anon
-- AND authenticated still hold EXECUTE, so the 040 revoke never took full effect
-- (direct default-privilege grants survive a PUBLIC-only revoke). This is the
-- same exploitable class as apply_coupon (SECURITY DEFINER, caller-supplied
-- p_user_id). Sole caller is the coupon-apply Edge Function (service_role).
REVOKE EXECUTE ON FUNCTION public.apply_asset_coupon(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_asset_coupon(TEXT, UUID, TEXT) TO service_role;

-- ============================================
-- 2. coupons — drop the enumeration-leak SELECT policy
-- ============================================
-- Verified safe: the only client-side .from('coupons') reads are the admin
-- methods in services/api/coupons.api.ts (adminListCoupons / adminCreateCoupon /
-- adminDeactivateCoupon), all covered by the "Admins manage coupons" is_admin()
-- policy (017), which stays untouched. User redemption goes exclusively through
-- the coupon-apply Edge Function (service_role — bypasses RLS).
DROP POLICY IF EXISTS "Users read active coupons" ON public.coupons;

-- ============================================
-- 3. set_bundle_courses — admin-gated (DROP-before-replace, per 035/040)
-- ============================================
-- CHOICE: kept SECURITY DEFINER with an explicit is_admin() gate rather than
-- flipping to SECURITY INVOKER. bundle_courses does have complete admin-write
-- RLS (007: insert/update/delete all is_admin()), but INVOKER additionally
-- relies on the live table-level GRANTs for `authenticated`, which this
-- migration cannot verify against the shared remote DB — and DEFINER+gate
-- matches the repo's established hardening style (034/035/040) and fails
-- loudly (FORBIDDEN) instead of silently no-opping. Legitimate caller is the
-- admin frontend via supabase.rpc as `authenticated`
-- (services/api/admin.api.ts customRpc), so `authenticated` keeps EXECUTE and
-- the gate does the real enforcement.
-- NOTE: the is_admin() gate also blocks service_role (auth.uid() is NULL there);
-- no Edge Function calls this RPC today — the service_role grant is parity only.
DROP FUNCTION IF EXISTS public.set_bundle_courses(text, text[]);
CREATE OR REPLACE FUNCTION public.set_bundle_courses(p_bundle_id text, p_course_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE i integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM bundle_courses WHERE bundle_id = p_bundle_id;
  FOR i IN 1..coalesce(array_length(p_course_ids, 1), 0) LOOP
    INSERT INTO bundle_courses (bundle_id, course_id, order_index)
    VALUES (p_bundle_id, p_course_ids[i], i - 1);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_bundle_courses(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bundle_courses(text, text[]) TO authenticated, service_role;

-- ============================================
-- 4. reorder_modules — admin-gated (DROP-before-replace, per 035/040)
-- ============================================
-- CHOICE: same reasoning as set_bundle_courses. modules also has complete
-- admin-write RLS (003: modules_insert/update/delete all is_admin()), so
-- INVOKER was viable, but DEFINER + explicit gate avoids any dependence on
-- unverifiable live table GRANTs and keeps both admin RPCs uniform. Caller is
-- admin drag-drop via `authenticated` (admin.api.ts) — keeps working.
-- Body preserved from 014 except: loop bound wrapped in coalesce(...) so an
-- empty/NULL array is a graceful no-op instead of a plpgsql error (matches the
-- 034 reorder_lessons style; admin UI always sends a non-empty array).
DROP FUNCTION IF EXISTS public.reorder_modules(text, text[]);
CREATE OR REPLACE FUNCTION public.reorder_modules(p_course_id text, p_module_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE i integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOR i IN 1..coalesce(array_length(p_module_ids, 1), 0) LOOP
    UPDATE modules SET order_index = i
    WHERE id = p_module_ids[i] AND course_id = p_course_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_modules(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_modules(text, text[]) TO authenticated, service_role;

-- ============================================
-- 5. reorder_lessons — admin-gated (DROP-before-replace, per 035/040)
-- ============================================
-- Same class as reorder_modules: 034 wrote it to the hardening pattern
-- (search_path + REVOKE FROM PUBLIC + GRANT authenticated) but with no
-- is_admin() gate in the body — any authenticated user could reorder any
-- chapter's lessons. Body preserved from 034 verbatim apart from the gate.
DROP FUNCTION IF EXISTS public.reorder_lessons(text, text[]);
CREATE OR REPLACE FUNCTION public.reorder_lessons(p_module_id text, p_lesson_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE i integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOR i IN 1..coalesce(array_length(p_lesson_ids, 1), 0) LOOP
    UPDATE lessons SET order_index = i
    WHERE id = p_lesson_ids[i] AND module_id = p_module_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_lessons(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_lessons(text, text[]) TO authenticated, service_role;

-- ============================================
-- VERIFICATION QUERIES (run manually after applying — do not uncomment here)
-- ============================================
-- NOTE: pg_proc.prosecdef only distinguishes DEFINER vs INVOKER — it CANNOT
-- detect a missing REVOKE. Check actual EXECUTE privilege per role:
--
-- SELECT
--   p.oid::regprocedure AS fn,
--   has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
--   has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
--   has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_exec
-- FROM pg_proc p
-- WHERE p.oid IN (
--   'public.apply_coupon(text, uuid, text)'::regprocedure,
--   'public.apply_asset_coupon(text, uuid, text)'::regprocedure,
--   'public.set_bundle_courses(text, text[])'::regprocedure,
--   'public.reorder_modules(text, text[])'::regprocedure,
--   'public.reorder_lessons(text, text[])'::regprocedure
-- );
--
-- Expected:
--   apply_coupon        → anon f | authenticated f | service_role t
--   apply_asset_coupon  → anon f | authenticated f | service_role t
--   set_bundle_courses  → anon f | authenticated t | service_role t
--   reorder_modules     → anon f | authenticated t | service_role t
--   reorder_lessons     → anon f | authenticated t | service_role t
--
-- SELECT policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'coupons';
--
-- Expected: exactly ONE policy remains — "Admins manage coupons" (ALL, is_admin()).
