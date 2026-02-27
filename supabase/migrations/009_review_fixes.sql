-- Migration 009: Post-audit review fixes
-- Addresses payment security, race conditions, and legacy cleanup

-- ============================================
-- 1. Unique constraint on razorpay_payment_id to prevent duplicate payments
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id
  ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- ============================================
-- 2. Add FOR UPDATE lock in complete_module() to prevent race conditions
-- ============================================
CREATE OR REPLACE FUNCTION complete_module(
  p_user_id UUID,
  p_module_id TEXT,
  p_course_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_total_modules INTEGER;
  v_completed_count INTEGER;
  v_percent INTEGER;
  v_enrollment_id TEXT;
  v_module_exists BOOLEAN;
BEGIN
  -- Validate module belongs to course
  SELECT EXISTS (
    SELECT 1 FROM modules WHERE id = p_module_id AND course_id = p_course_id
  ) INTO v_module_exists;

  IF NOT v_module_exists THEN
    RAISE EXCEPTION 'Module does not belong to this course';
  END IF;

  -- Find the enrollment (with row lock to prevent concurrent race conditions)
  SELECT id INTO v_enrollment_id
  FROM enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'ACTIVE'
  FOR UPDATE;

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'No active enrollment found';
  END IF;

  -- Mark progress completed
  UPDATE progress
  SET completed = true, completed_at = now(), last_updated_at = now()
  WHERE user_id = p_user_id AND module_id = p_module_id AND course_id = p_course_id;

  -- If no progress record exists, create one
  IF NOT FOUND THEN
    INSERT INTO progress (user_id, module_id, course_id, completed, completed_at, last_updated_at)
    VALUES (p_user_id, p_module_id, p_course_id, true, now(), now())
    ON CONFLICT (user_id, course_id, module_id) DO UPDATE
    SET completed = true, completed_at = now(), last_updated_at = now();
  END IF;

  -- Count total and completed modules
  SELECT COUNT(*) INTO v_total_modules FROM modules WHERE course_id = p_course_id;
  SELECT COUNT(*) INTO v_completed_count FROM progress p
    JOIN modules m ON p.module_id = m.id
    WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true;

  -- Guard division by zero
  IF v_total_modules > 0 THEN
    v_percent := ROUND((v_completed_count::REAL / v_total_modules::REAL) * 100);
  ELSE
    v_percent := 0;
  END IF;

  -- Update enrollment denormalized fields
  UPDATE enrollments
  SET completed_modules = (
        SELECT ARRAY_AGG(DISTINCT m.id)
        FROM progress p
        JOIN modules m ON p.module_id = m.id
        WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true
      ),
      overall_percent = v_percent,
      updated_at = now()
  WHERE id = v_enrollment_id;

  RETURN jsonb_build_object(
    'completed_count', v_completed_count,
    'total_modules', v_total_modules,
    'percent', v_percent,
    'enrollment_id', v_enrollment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Add missing index on notifications.created_at for efficient queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(user_id, created_at DESC);

-- ============================================
-- 4. Drop unused legacy tables (Supabase Auth manages sessions)
-- ============================================
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS sessions;
