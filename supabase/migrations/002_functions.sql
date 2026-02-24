-- Eyebuckz LMS: Database Functions (RPC)
-- Replaces Prisma $transaction and complex aggregation queries

-- ============================================
-- ATOMIC MODULE COMPLETION
-- Replaces the Prisma $transaction in progress route
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
BEGIN
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

-- ============================================
-- ADMIN STATS (parallel aggregation in single DB call)
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_total_revenue BIGINT;
  v_total_courses INTEGER;
  v_draft_courses INTEGER;
  v_total_enrollments INTEGER;
  v_total_certificates INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(*) INTO v_active_users FROM users WHERE last_login_at > now() - INTERVAL '30 days';
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue FROM enrollments WHERE status = 'ACTIVE';
  SELECT COUNT(*) INTO v_total_courses FROM courses WHERE status = 'PUBLISHED';
  SELECT COUNT(*) INTO v_draft_courses FROM courses WHERE status = 'DRAFT';
  SELECT COUNT(*) INTO v_total_enrollments FROM enrollments WHERE status = 'ACTIVE';
  SELECT COUNT(*) INTO v_total_certificates FROM certificates WHERE status = 'ACTIVE';

  RETURN jsonb_build_object(
    'totalUsers', v_total_users,
    'activeUsers', v_active_users,
    'totalRevenue', v_total_revenue,
    'totalCourses', v_total_courses,
    'draftCourses', v_draft_courses,
    'totalEnrollments', v_total_enrollments,
    'totalCertificates', v_total_certificates
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SALES DATA AGGREGATION
-- ============================================
CREATE OR REPLACE FUNCTION get_sales_data(p_days INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, amount BIGINT, count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.enrolled_at::date as date,
    COALESCE(SUM(e.amount), 0)::BIGINT as amount,
    COUNT(*)::INTEGER as count
  FROM enrollments e
  WHERE e.enrolled_at >= now() - (p_days || ' days')::INTERVAL
    AND e.status = 'ACTIVE'
  GROUP BY e.enrolled_at::date
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECENT ACTIVITY FOR ADMIN DASHBOARD
-- ============================================
CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INTEGER DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
  v_enrollments JSONB;
  v_certificates JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_enrollments
  FROM (
    SELECT e.id, u.name as "userName", u.email as "userEmail",
           c.title as "courseTitle", e.enrolled_at as "enrolledAt"
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    WHERE e.status = 'ACTIVE'
    ORDER BY e.enrolled_at DESC
    LIMIT p_limit
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_certificates
  FROM (
    SELECT cert.id, cert.student_name as "studentName",
           cert.course_title as "courseTitle", cert.issue_date as "issueDate"
    FROM certificates cert
    WHERE cert.status = 'ACTIVE'
    ORDER BY cert.issue_date DESC
    LIMIT p_limit
  ) t;

  RETURN jsonb_build_object(
    'recentEnrollments', v_enrollments,
    'recentCertificates', v_certificates
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE COURSE RATING ON REVIEW CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id TEXT;
BEGIN
  v_course_id := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses
  SET rating = (SELECT AVG(rating)::REAL FROM reviews WHERE course_id = v_course_id),
      total_students = (SELECT COUNT(DISTINCT user_id) FROM enrollments WHERE course_id = v_course_id AND status = 'ACTIVE')
  WHERE id = v_course_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- ============================================
-- PROGRESS STATS FOR A COURSE
-- ============================================
CREATE OR REPLACE FUNCTION get_progress_stats(p_user_id UUID, p_course_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total_modules INTEGER;
  v_completed_modules INTEGER;
  v_total_watch_time INTEGER;
  v_current_module TEXT;
  v_percent INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_modules FROM modules WHERE course_id = p_course_id;

  SELECT COUNT(*) INTO v_completed_modules
  FROM progress p
  JOIN modules m ON p.module_id = m.id
  WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true;

  SELECT COALESCE(SUM(p.watch_time), 0) INTO v_total_watch_time
  FROM progress p
  JOIN modules m ON p.module_id = m.id
  WHERE p.user_id = p_user_id AND m.course_id = p_course_id;

  SELECT current_module INTO v_current_module
  FROM enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'ACTIVE';

  IF v_total_modules > 0 THEN
    v_percent := ROUND((v_completed_modules::REAL / v_total_modules::REAL) * 100);
  ELSE
    v_percent := 0;
  END IF;

  RETURN jsonb_build_object(
    'completedModules', v_completed_modules,
    'totalModules', v_total_modules,
    'overallPercent', v_percent,
    'totalWatchTime', v_total_watch_time,
    'currentModule', v_current_module
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
