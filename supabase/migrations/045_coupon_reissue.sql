-- Migration: 045_coupon_reissue
-- Fix the coupon "burn before pay" defect: apply_coupon inserts a coupon_uses
-- row + increments use_count at APPLY time, but nothing releases it if checkout
-- is abandoned — so a customer who closes the Razorpay modal is permanently
-- locked out with COUPON_ALREADY_USED. New semantics: an un-consumed prior use
-- is RE-ISSUED (returned) instead of raising; only a consumed use blocks re-use.
-- checkout-verify/webhook mark a use consumed_at once payment lands (migration
-- 044-era edge changes). Also re-applies the service_role lockdown from 042
-- (DROP+CREATE drops the grants).
-- Created: 2026-08-04

-- Idempotent: 042 already dropped this enumeration-leak policy; keep for a clean
-- fresh `supabase db reset`.
DROP POLICY IF EXISTS "Users read active coupons" ON public.coupons;

-- ── consumption linkage ──────────────────────────────────────────
ALTER TABLE public.coupon_uses
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_id    TEXT;
CREATE INDEX IF NOT EXISTS idx_coupon_uses_order ON public.coupon_uses(order_id);
-- Existing rows predate the column (consumed_at NULL). They were burned under the
-- old semantics; leaving them NULL lets the re-apply path heal them (return the
-- existing use), which is the desired behavior.

-- ── replacement apply_coupon (course) ────────────────────────────
DROP FUNCTION IF EXISTS public.apply_coupon(TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.apply_coupon(
  p_code TEXT, p_user_id UUID, p_course_id TEXT
) RETURNS TABLE (coupon_use_id UUID, discount_pct INTEGER) AS $$
DECLARE
  v_coupon        coupons%ROWTYPE;
  v_existing      coupon_uses%ROWTYPE;
  v_coupon_use_id UUID;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COUPON_NOT_FOUND'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'COUPON_INACTIVE'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  -- Existing-use check BEFORE max_uses: a returning user with an abandoned,
  -- un-consumed use gets it back even if the coupon has since sold out (their
  -- use was already counted in use_count at first apply).
  SELECT * INTO v_existing FROM coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id AND course_id = p_course_id;
  IF FOUND THEN
    IF v_existing.consumed_at IS NOT NULL THEN
      RAISE EXCEPTION 'COUPON_ALREADY_USED';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.discount_pct;  -- re-issue, no re-count
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.use_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  INSERT INTO coupon_uses (coupon_id, user_id, course_id, discount_pct)
  VALUES (v_coupon.id, p_user_id, p_course_id, v_coupon.discount_pct)
  RETURNING id INTO v_coupon_use_id;
  UPDATE coupons SET use_count = use_count + 1 WHERE id = v_coupon.id;
  RETURN QUERY SELECT v_coupon_use_id, v_coupon.discount_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_coupon(TEXT, UUID, TEXT) TO service_role;

-- ── replacement apply_asset_coupon (asset twin — shared consumed_at column) ──
DROP FUNCTION IF EXISTS public.apply_asset_coupon(TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.apply_asset_coupon(
  p_code TEXT, p_user_id UUID, p_asset_id TEXT
) RETURNS TABLE (coupon_use_id UUID, discount_pct INTEGER) AS $$
DECLARE
  v_coupon        coupons%ROWTYPE;
  v_existing      coupon_uses%ROWTYPE;
  v_coupon_use_id UUID;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COUPON_NOT_FOUND'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'COUPON_INACTIVE'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  SELECT * INTO v_existing FROM coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id AND asset_id = p_asset_id;
  IF FOUND THEN
    IF v_existing.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'COUPON_ALREADY_USED'; END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.discount_pct; RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.use_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  INSERT INTO coupon_uses (coupon_id, user_id, asset_id, discount_pct)
  VALUES (v_coupon.id, p_user_id, p_asset_id, v_coupon.discount_pct)
  RETURNING id INTO v_coupon_use_id;
  UPDATE coupons SET use_count = use_count + 1 WHERE id = v_coupon.id;
  RETURN QUERY SELECT v_coupon_use_id, v_coupon.discount_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.apply_asset_coupon(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_asset_coupon(TEXT, UUID, TEXT) TO service_role;
