-- Migration: 044_upgrade_pricing
-- Entitlement-based upgrade pricing (module -> bundle). A customer who already
-- bought individual module courses gets the amount they actually paid credited
-- toward the full bundle, derived server-side (no shareable coupon code).
-- All policy is runtime-editable config (no redeploy to change credit %, window,
-- cross-sell). Locked defaults (owner, 2026-08): 100% credit, no time window,
-- cross-sell off.
-- Created: 2026-08-04

-- ── 1. Policy knobs (single row) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upgrade_pricing_config (
  id             INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  credit_pct     INTEGER NOT NULL DEFAULT 100 CHECK (credit_pct BETWEEN 0 AND 100),
  window_days    INTEGER CHECK (window_days IS NULL OR window_days > 0),  -- NULL = no time limit
  cross_sell_pct INTEGER NOT NULL DEFAULT 0 CHECK (cross_sell_pct BETWEEN 0 AND 100), -- 0 = off
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.upgrade_pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.upgrade_pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY upgrade_pricing_config_read  ON public.upgrade_pricing_config FOR SELECT USING (true);
CREATE POLICY upgrade_pricing_config_admin ON public.upgrade_pricing_config FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER upgrade_pricing_config_updated_at BEFORE UPDATE ON public.upgrade_pricing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Credit ledger ────────────────────────────────────────────
-- payments.id is TEXT (006). ON DELETE CASCADE on source_payment_id so a user
-- deletion (which cascades into payments) does not deadlock on RESTRICT.
CREATE TABLE IF NOT EXISTS public.upgrade_credits_applied (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_payment_id TEXT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  target_course_id  TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  target_order_id   TEXT,               -- razorpay order id (or free-claim marker) that consumed it
  credit_paise      INTEGER NOT NULL CHECK (credit_paise >= 0),
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_payment_id)
);
CREATE INDEX idx_upgrade_credits_user   ON public.upgrade_credits_applied(user_id);
CREATE INDEX idx_upgrade_credits_source ON public.upgrade_credits_applied(source_payment_id);
CREATE INDEX idx_upgrade_credits_order  ON public.upgrade_credits_applied(target_order_id);
ALTER TABLE public.upgrade_credits_applied ENABLE ROW LEVEL SECURITY;
CREATE POLICY upgrade_credits_select_own ON public.upgrade_credits_applied
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY upgrade_credits_admin_all ON public.upgrade_credits_applied
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- No user INSERT/UPDATE/DELETE: writes only via service_role / SECURITY DEFINER RPC.

-- ── 3. get_upgrade_quote: PURE READ, safe for authenticated clients ──
-- p_user_id defaults to auth.uid() and is guarded so the SAME function serves
-- the client UI (self only) and service_role edge functions (any user).
CREATE OR REPLACE FUNCTION public.get_upgrade_quote(
  p_course_id TEXT,
  p_user_id   UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user       UUID := COALESCE(p_user_id, auth.uid());
  v_cfg        upgrade_pricing_config%ROWTYPE;
  v_course     courses%ROWTYPE;
  v_credit     BIGINT := 0;
  v_final      INTEGER;
  v_source_ids TEXT[] := '{}';
BEGIN
  -- Authenticated callers may only quote for themselves; service_role
  -- (auth.uid() IS NULL) may pass any user.
  IF auth.uid() IS NOT NULL AND v_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'USER_REQUIRED'; END IF;

  SELECT * INTO v_cfg FROM upgrade_pricing_config WHERE id = 1;
  SELECT * INTO v_course FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('base_price', NULL, 'credit_paise', 0, 'final_price', NULL,
                              'reason', 'COURSE_NOT_FOUND', 'source_payment_ids', '[]'::jsonb);
  END IF;
  IF v_cfg.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', 0,
      'final_price', v_course.price, 'reason', 'DISABLED', 'source_payment_ids', '[]'::jsonb);
  END IF;
  IF EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = v_user AND e.course_id = p_course_id
             AND e.status = 'ACTIVE' AND (e.expires_at IS NULL OR e.expires_at > now())) THEN
    RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', 0,
      'final_price', v_course.price, 'reason', 'ALREADY_ENROLLED', 'source_payment_ids', '[]'::jsonb);
  END IF;

  IF v_course.type = 'BUNDLE' THEN
    -- Captured, non-refunded, non-consumed payments for member courses the user
    -- still actively owns. Per-payment FLOOR so quote and apply agree to the paisa.
    SELECT COALESCE(SUM(FLOOR(p.amount * v_cfg.credit_pct / 100.0)::BIGINT), 0),
           COALESCE(array_agg(p.id), '{}')
      INTO v_credit, v_source_ids
    FROM payments p
    JOIN bundle_courses bc ON bc.course_id = p.course_id AND bc.bundle_id = p_course_id
    JOIN enrollments   e  ON e.user_id = p.user_id AND e.course_id = p.course_id
         AND e.status = 'ACTIVE' AND (e.expires_at IS NULL OR e.expires_at > now())
    WHERE p.user_id = v_user
      AND p.status = 'captured'
      AND p.course_id IS NOT NULL
      AND (v_cfg.window_days IS NULL OR p.created_at > now() - make_interval(days => v_cfg.window_days))
      AND NOT EXISTS (SELECT 1 FROM upgrade_credits_applied uca
                      WHERE uca.user_id = p.user_id AND uca.source_payment_id = p.id);

    v_credit := LEAST(v_credit, v_course.price);
    v_final  := GREATEST(v_course.price - v_credit::INT, 0);
    IF v_credit <= 0 THEN
      RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', 0,
        'final_price', v_course.price, 'reason', 'NO_CREDITS', 'source_payment_ids', '[]'::jsonb);
    END IF;
    RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', v_credit,
      'final_price', v_final, 'reason', 'UPGRADE', 'source_payment_ids', to_jsonb(v_source_ids));
  END IF;

  -- MODULE target: optional sibling cross-sell — flat % off, NO ledger consumption.
  IF v_cfg.cross_sell_pct > 0 AND EXISTS (
    SELECT 1 FROM payments p
    JOIN bundle_courses bc_owned  ON bc_owned.course_id = p.course_id
    JOIN bundle_courses bc_target ON bc_target.bundle_id = bc_owned.bundle_id
         AND bc_target.course_id = p_course_id
    WHERE p.user_id = v_user AND p.status = 'captured' AND p.course_id IS NOT NULL
  ) THEN
    v_final := GREATEST(v_course.price - FLOOR(v_course.price * v_cfg.cross_sell_pct / 100.0)::INT, 0);
    RETURN jsonb_build_object('base_price', v_course.price,
      'credit_paise', v_course.price - v_final, 'final_price', v_final,
      'reason', 'CROSS_SELL', 'source_payment_ids', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', 0,
    'final_price', v_course.price, 'reason', 'NOT_ELIGIBLE', 'source_payment_ids', '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.get_upgrade_quote(TEXT, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_upgrade_quote(TEXT, UUID) TO authenticated, service_role;

-- ── 4. apply_upgrade_credit: CONSUMING, service_role only ────────
-- Called by checkout-verify / checkout-webhook / course-claim-free. Re-derives,
-- locks sources, inserts ledger rows, and validates the paid amount — all in ONE
-- transaction; any RAISE rolls back the inserts.
CREATE OR REPLACE FUNCTION public.apply_upgrade_credit(
  p_user_id     UUID,
  p_course_id   TEXT,
  p_paid_amount INTEGER,
  p_order_id    TEXT
) RETURNS JSONB AS $$
DECLARE
  v_cfg     upgrade_pricing_config%ROWTYPE;
  v_course  courses%ROWTYPE;
  v_total   BIGINT := 0;
  v_final   INTEGER;
  v_sources JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  SELECT * INTO v_cfg FROM upgrade_pricing_config WHERE id = 1;
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF NOT FOUND OR v_course.type <> 'BUNDLE' OR v_cfg.enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'UPGRADE_NOT_AVAILABLE';
  END IF;

  -- Serialize all upgrade-credit consumption for this user. Under READ COMMITTED,
  -- FOR UPDATE alone doesn't stop a concurrent txn's stale NOT-EXISTS anti-check
  -- from re-consuming the same source (payments are never UPDATEd, so no EvalPlanQual
  -- recheck fires). A per-user advisory xact lock makes the second caller wait, then
  -- see the first's committed ledger rows (idempotent branch or NOT EXISTS).
  PERFORM pg_advisory_xact_lock(hashtext('upgrade_credit:' || p_user_id::text));

  -- Idempotent retry: if this order already consumed credits (verify retried, or
  -- webhook raced verify), validate against the recorded rows and return.
  SELECT COALESCE(SUM(credit_paise), 0), COALESCE(jsonb_agg(source_payment_id), '[]'::jsonb)
    INTO v_total, v_sources
  FROM upgrade_credits_applied
  WHERE user_id = p_user_id AND target_order_id = p_order_id;
  IF v_total > 0 THEN
    v_total := LEAST(v_total, v_course.price);
    v_final := GREATEST(v_course.price - v_total::INT, 0);
    IF v_final >= 100 AND v_final <> p_paid_amount THEN
      RAISE EXCEPTION 'UPGRADE_AMOUNT_MISMATCH expected=% paid=%', v_final, p_paid_amount;
    END IF;
    RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', v_total,
      'final_price', v_final, 'source_payment_ids', v_sources, 'already_applied', true);
  END IF;

  v_total := 0; v_sources := '[]'::jsonb;
  FOR r IN
    SELECT p.id, FLOOR(p.amount * v_cfg.credit_pct / 100.0)::INT AS credit
    FROM payments p
    JOIN bundle_courses bc ON bc.course_id = p.course_id AND bc.bundle_id = p_course_id
    JOIN enrollments   e  ON e.user_id = p.user_id AND e.course_id = p.course_id
         AND e.status = 'ACTIVE' AND (e.expires_at IS NULL OR e.expires_at > now())
    WHERE p.user_id = p_user_id AND p.status = 'captured' AND p.course_id IS NOT NULL
      AND (v_cfg.window_days IS NULL OR p.created_at > now() - make_interval(days => v_cfg.window_days))
      AND NOT EXISTS (SELECT 1 FROM upgrade_credits_applied uca
                      WHERE uca.user_id = p.user_id AND uca.source_payment_id = p.id)
    ORDER BY p.created_at
    FOR UPDATE OF p
  LOOP
    v_total := v_total + r.credit;
    INSERT INTO upgrade_credits_applied
      (user_id, source_payment_id, target_course_id, target_order_id, credit_paise)
    VALUES (p_user_id, r.id, p_course_id, p_order_id, r.credit);
    v_sources := v_sources || to_jsonb(r.id);
  END LOOP;

  v_total := LEAST(v_total, v_course.price);
  v_final := GREATEST(v_course.price - v_total::INT, 0);
  -- Sub-₹1 remainders are waived (Razorpay minimum order is 100 paise): finals
  -- < 100 accept any p_paid_amount (the free-claim path passes 0).
  IF v_final >= 100 AND v_final <> p_paid_amount THEN
    RAISE EXCEPTION 'UPGRADE_AMOUNT_MISMATCH expected=% paid=%', v_final, p_paid_amount;
  END IF;
  RETURN jsonb_build_object('base_price', v_course.price, 'credit_paise', v_total,
    'final_price', v_final, 'source_payment_ids', v_sources, 'already_applied', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.apply_upgrade_credit(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_upgrade_credit(UUID, TEXT, INTEGER, TEXT) TO service_role;

-- ── Verification (run manually after apply) ──────────────────────
-- SELECT * FROM upgrade_pricing_config;  -- one row: enabled t, credit_pct 100, window_days NULL
-- SELECT has_function_privilege('anon','public.get_upgrade_quote(text,uuid)','EXECUTE');          -- f
-- SELECT has_function_privilege('authenticated','public.get_upgrade_quote(text,uuid)','EXECUTE'); -- t
-- SELECT has_function_privilege('authenticated','public.apply_upgrade_credit(uuid,text,integer,text)','EXECUTE'); -- f
