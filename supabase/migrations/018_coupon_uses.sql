-- Migration 018: Coupon uses tracking, certificate uniqueness, performance indexes

-- ─── coupon_uses table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  discount_pct INTEGER NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id, course_id)
);

ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own coupon uses"
  ON coupon_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage coupon uses"
  ON coupon_uses FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── apply_coupon atomic function ────────────────────────────────────────────
-- Validates the coupon, records the use, and increments use_count atomically.
-- Raises exceptions for invalid/expired/over-limit/duplicate uses.

CREATE OR REPLACE FUNCTION apply_coupon(
  p_code     TEXT,
  p_user_id  UUID,
  p_course_id TEXT
) RETURNS TABLE (coupon_use_id UUID, discount_pct INTEGER) AS $$
DECLARE
  v_coupon       coupons%ROWTYPE;
  v_coupon_use_id UUID;
BEGIN
  -- Lock the coupon row for update to prevent race conditions
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'COUPON_INACTIVE';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.use_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED';
  END IF;

  -- Check per-user uniqueness for this course
  IF EXISTS (
    SELECT 1 FROM coupon_uses
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'COUPON_ALREADY_USED';
  END IF;

  -- Record the use
  INSERT INTO coupon_uses (coupon_id, user_id, course_id, discount_pct)
  VALUES (v_coupon.id, p_user_id, p_course_id, v_coupon.discount_pct)
  RETURNING id INTO v_coupon_use_id;

  -- Increment use_count
  UPDATE coupons SET use_count = use_count + 1 WHERE id = v_coupon.id;

  RETURN QUERY SELECT v_coupon_use_id, v_coupon.discount_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Certificate uniqueness constraint ───────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_cert_user_course' AND conrelid = 'certificates'::regclass
  ) THEN
    ALTER TABLE certificates ADD CONSTRAINT uniq_cert_user_course UNIQUE (user_id, course_id);
  END IF;
END $$;

-- ─── Enrollment expiry RLS ───────────────────────────────────────────────────
-- Update enrollment SELECT policy to filter expired rows at DB level

DROP POLICY IF EXISTS "Users see own active enrollments" ON enrollments;
CREATE POLICY "Users see own active enrollments"
  ON enrollments FOR SELECT
  USING (
    auth.uid() = user_id
    AND status = 'ACTIVE'
    AND (expires_at IS NULL OR expires_at > now())
  );

-- ─── Performance indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_progress_user_course_module
  ON progress (user_id, course_id, module_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_status
  ON enrollments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_coupon_uses_user
  ON coupon_uses (user_id, coupon_id);

CREATE INDEX IF NOT EXISTS idx_certificates_user
  ON certificates (user_id);
