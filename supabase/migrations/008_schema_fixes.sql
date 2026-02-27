-- Migration 008: Schema Fixes
-- Fixes: type mismatches, CHECK constraints, index, RLS tightening, function validation

-- ============================================
-- 1. Fix payments.course_id: UUID → TEXT (courses.id is TEXT)
-- ============================================
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_course_id_fkey;
ALTER TABLE public.payments ALTER COLUMN course_id TYPE TEXT USING course_id::TEXT;
ALTER TABLE public.payments ALTER COLUMN course_id DROP NOT NULL; -- allow NULL for failed payments
ALTER TABLE public.payments
  ADD CONSTRAINT payments_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Fix enrollment_id FK type (enrollments.id is TEXT, not UUID)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_enrollment_id_fkey;
ALTER TABLE public.payments ALTER COLUMN enrollment_id TYPE TEXT USING enrollment_id::TEXT;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_enrollment_id_fkey
  FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE SET NULL;

-- ============================================
-- 2. Fix get_course_analytics() parameter type: UUID → TEXT
-- ============================================
DROP FUNCTION IF EXISTS get_course_analytics(UUID);

CREATE OR REPLACE FUNCTION get_course_analytics(p_course_id TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalEnrollments', (
      SELECT COUNT(*) FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'completionRate', (
      SELECT COALESCE(
        ROUND(AVG(CASE WHEN overall_percent >= 100 THEN 100 ELSE 0 END)::NUMERIC, 1),
        0
      )
      FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'avgWatchTimeMinutes', (
      SELECT COALESCE(ROUND(AVG(total_watch_time) / 60.0, 1), 0)
      FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'revenueTotal', (
      SELECT COALESCE(SUM(amount), 0) FROM payments WHERE course_id = p_course_id AND status = 'captured'
    ),
    'activeStudents30d', (
      SELECT COUNT(*) FROM enrollments
      WHERE course_id = p_course_id
        AND status = 'ACTIVE'
        AND last_accessed_at > NOW() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Add missing FK on progress.course_id
-- ============================================
ALTER TABLE public.progress
  ADD CONSTRAINT progress_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- ============================================
-- 4-10. CHECK constraints for data integrity
-- ============================================
ALTER TABLE public.courses ADD CONSTRAINT courses_price_non_negative CHECK (price >= 0);
ALTER TABLE public.courses ADD CONSTRAINT courses_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
ALTER TABLE public.courses ADD CONSTRAINT courses_total_students_non_negative CHECK (total_students >= 0);
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_amount_non_negative CHECK (amount >= 0);
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_non_negative CHECK (amount >= 0);
ALTER TABLE public.payments ADD CONSTRAINT payments_refund_amount_valid CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount));
ALTER TABLE public.progress ADD CONSTRAINT progress_watch_time_non_negative CHECK (watch_time >= 0);

-- ============================================
-- 11. Index on progress.course_id (used in analytics queries)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_progress_course_id ON public.progress(course_id);

-- ============================================
-- 12. Tighten users SELECT policy: own record + admin (was USING (true))
-- ============================================
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select_own ON public.users FOR SELECT
  USING (id = auth.uid());
CREATE POLICY users_select_admin ON public.users FOR SELECT
  USING (is_admin());

-- ============================================
-- 13. Tighten login_attempts INSERT (was WITH CHECK (true))
-- Edge Functions use service_role which bypasses RLS entirely
-- ============================================
DROP POLICY IF EXISTS login_attempts_insert ON public.login_attempts;
CREATE POLICY login_attempts_insert ON public.login_attempts FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- 14. Tighten certificates SELECT: users see own ACTIVE only, admin sees all
-- ============================================
DROP POLICY IF EXISTS certificates_select ON public.certificates;
CREATE POLICY certificates_select_own ON public.certificates FOR SELECT
  USING (user_id = auth.uid() AND status = 'ACTIVE');
CREATE POLICY certificates_select_admin ON public.certificates FOR SELECT
  USING (is_admin());

-- ============================================
-- 15. Recreate complete_module() with module-course validation
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

  -- Find the enrollment
  SELECT id INTO v_enrollment_id
  FROM enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'ACTIVE';

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
