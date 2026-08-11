-- Migration: 043_bundle_assets
-- Description: Let a BUNDLE course include downloadable digital assets, not just
--              member courses. Mirrors bundle_courses (007). Buyers of the bundle
--              are granted the assets (fan-out in checkout-verify/checkout-webhook).
-- Created: 2026-08-04

-- ============================================
-- bundle_assets junction (bundle course → digital asset)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bundle_assets (
  bundle_id   TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  asset_id    TEXT NOT NULL REFERENCES public.digital_assets(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bundle_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_assets_bundle ON public.bundle_assets(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_assets_asset  ON public.bundle_assets(asset_id);

-- ============================================
-- RLS — mirrors bundle_courses (007): public read, admin-only writes.
-- Membership is public catalog info; the storefront hydration filters to
-- PUBLISHED assets separately.
-- ============================================
ALTER TABLE public.bundle_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_assets_public_read" ON public.bundle_assets
  FOR SELECT USING (true);

CREATE POLICY "bundle_assets_admin_insert" ON public.bundle_assets
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "bundle_assets_admin_update" ON public.bundle_assets
  FOR UPDATE USING (is_admin());
CREATE POLICY "bundle_assets_admin_delete" ON public.bundle_assets
  FOR DELETE USING (is_admin());

-- ============================================
-- set_bundle_assets(bundle_id, asset_ids[]) — atomic replace.
-- Hardened from day one, matching 042's set_bundle_courses: SECURITY DEFINER
-- with an explicit is_admin() gate + pinned search_path; PUBLIC/anon revoked,
-- authenticated (admin frontend via supabase.rpc) + service_role granted.
-- ============================================
CREATE OR REPLACE FUNCTION public.set_bundle_assets(p_bundle_id text, p_asset_ids text[])
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

  DELETE FROM bundle_assets WHERE bundle_id = p_bundle_id;
  FOR i IN 1..coalesce(array_length(p_asset_ids, 1), 0) LOOP
    INSERT INTO bundle_assets (bundle_id, asset_id, order_index)
    VALUES (p_bundle_id, p_asset_ids[i], i - 1);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_bundle_assets(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bundle_assets(text, text[]) TO authenticated, service_role;

-- ============================================
-- VERIFICATION QUERIES (run manually after applying)
-- ============================================
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'bundle_assets'; -- expect t
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bundle_assets';    -- 4 policies
-- SELECT has_function_privilege('anon','public.set_bundle_assets(text,text[])','EXECUTE'),           -- f
--        has_function_privilege('authenticated','public.set_bundle_assets(text,text[])','EXECUTE'); -- t
