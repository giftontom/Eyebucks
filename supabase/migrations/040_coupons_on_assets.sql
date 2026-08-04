-- Migration: 040_coupons_on_assets
-- Description: Extend the coupon system to digital assets. A coupon_use now targets
--              EXACTLY ONE of course_id / asset_id. Adds apply_asset_coupon (atomic),
--              mirroring apply_coupon — the working course RPC is left untouched.
-- Created: 2026-06-22

-- ── coupon_uses: allow asset-targeted redemptions ────────────────────────────
ALTER TABLE public.coupon_uses ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.coupon_uses
  ADD COLUMN IF NOT EXISTS asset_id TEXT REFERENCES public.digital_assets(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.coupon_uses
    ADD CONSTRAINT coupon_uses_one_target CHECK (num_nonnulls(course_id, asset_id) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-user-per-asset uniqueness (the existing UNIQUE(coupon_id,user_id,course_id)
-- does not cover assets — NULL course_id rows don't conflict in SQL).
DO $$ BEGIN
  ALTER TABLE public.coupon_uses
    ADD CONSTRAINT coupon_uses_asset_unique UNIQUE (coupon_id, user_id, asset_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_uses_asset ON public.coupon_uses (asset_id);

-- ── apply_asset_coupon: atomic asset-coupon redemption ───────────────────────
-- Mirrors apply_coupon (018) but records an asset_id use. Validates + locks the
-- coupon row, enforces active/expiry/limit/per-user-asset uniqueness, increments
-- use_count. Raises the same COUPON_* exceptions the edge function maps to messages.
CREATE OR REPLACE FUNCTION apply_asset_coupon(
  p_code     TEXT,
  p_user_id  UUID,
  p_asset_id TEXT
) RETURNS TABLE (coupon_use_id UUID, discount_pct INTEGER) AS $$
DECLARE
  v_coupon        coupons%ROWTYPE;
  v_coupon_use_id UUID;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'COUPON_NOT_FOUND'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'COUPON_INACTIVE'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.use_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM coupon_uses
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id AND asset_id = p_asset_id
  ) THEN
    RAISE EXCEPTION 'COUPON_ALREADY_USED';
  END IF;

  INSERT INTO coupon_uses (coupon_id, user_id, asset_id, discount_pct)
  VALUES (v_coupon.id, p_user_id, p_asset_id, v_coupon.discount_pct)
  RETURNING id INTO v_coupon_use_id;

  UPDATE coupons SET use_count = use_count + 1 WHERE id = v_coupon.id;

  RETURN QUERY SELECT v_coupon_use_id, v_coupon.discount_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Called only by the coupon-apply Edge Function (service_role). Lock it down to
-- service_role so anon/authenticated can't invoke it directly (see the
-- REVOKE-FROM-PUBLIC gotcha — PUBLIC has EXECUTE by default).
REVOKE EXECUTE ON FUNCTION apply_asset_coupon(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_asset_coupon(TEXT, UUID, TEXT) TO service_role;
