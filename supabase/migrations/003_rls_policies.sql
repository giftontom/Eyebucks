-- Eyebuckz LMS: Row-Level Security Policies
-- Replaces ALL manual ownership checks in Express middleware

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Check if current user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- USERS
-- ============================================
-- Anyone can read basic profile info
CREATE POLICY users_select ON users FOR SELECT
  USING (true);

-- Users can update own profile
CREATE POLICY users_update_own ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any user
CREATE POLICY users_update_admin ON users FOR UPDATE
  USING (is_admin());

-- Insert handled by auth trigger, also allow admin
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (id = auth.uid() OR is_admin());

-- ============================================
-- COURSES
-- ============================================
-- Anyone can read published courses; admins see all
CREATE POLICY courses_select ON courses FOR SELECT
  USING (status = 'PUBLISHED' OR is_admin());

-- Only admins can create/update/delete
CREATE POLICY courses_insert ON courses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY courses_update ON courses FOR UPDATE USING (is_admin());
CREATE POLICY courses_delete ON courses FOR DELETE USING (is_admin());

-- ============================================
-- MODULES
-- ============================================
-- Anyone can read modules of published courses; admins see all
CREATE POLICY modules_select ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = modules.course_id AND (status = 'PUBLISHED' OR is_admin())
    )
  );

-- Only admins can create/update/delete
CREATE POLICY modules_insert ON modules FOR INSERT WITH CHECK (is_admin());
CREATE POLICY modules_update ON modules FOR UPDATE USING (is_admin());
CREATE POLICY modules_delete ON modules FOR DELETE USING (is_admin());

-- ============================================
-- ENROLLMENTS
-- ============================================
-- Users see own enrollments, admins see all
CREATE POLICY enrollments_select ON enrollments FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Insert: own enrollment only (payment verified via Edge Function)
CREATE POLICY enrollments_insert ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Update: own enrollment or admin
CREATE POLICY enrollments_update ON enrollments FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

-- Delete: admin only (revocation)
CREATE POLICY enrollments_delete ON enrollments FOR DELETE
  USING (is_admin());

-- ============================================
-- PROGRESS
-- ============================================
-- Users see own progress, admins see all
CREATE POLICY progress_select ON progress FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Insert/update: own progress only
CREATE POLICY progress_insert ON progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY progress_update ON progress FOR UPDATE
  USING (user_id = auth.uid());

-- Delete: own or admin (for reset)
CREATE POLICY progress_delete ON progress FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================
-- CERTIFICATES
-- ============================================
-- Users see own certificates, admins see all
CREATE POLICY certificates_select ON certificates FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Insert: admin or service_role (Edge Functions)
CREATE POLICY certificates_insert ON certificates FOR INSERT
  WITH CHECK (is_admin());

-- Update: admin only
CREATE POLICY certificates_update ON certificates FOR UPDATE
  USING (is_admin());

-- Delete: admin only (revocation)
CREATE POLICY certificates_delete ON certificates FOR DELETE
  USING (is_admin());

-- ============================================
-- REVIEWS
-- ============================================
-- Anyone can read reviews
CREATE POLICY reviews_select ON reviews FOR SELECT USING (true);

-- Users can create own reviews
CREATE POLICY reviews_insert ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own reviews
CREATE POLICY reviews_update ON reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete own reviews; admins can delete any
CREATE POLICY reviews_delete ON reviews FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================
-- NOTIFICATIONS
-- ============================================
-- Users see own notifications
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Insert: admin or service_role only (from Edge Functions)
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (is_admin());

-- Update (mark read): own notifications
CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Delete: own notifications
CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- SESSIONS (legacy audit table)
-- ============================================
CREATE POLICY sessions_select ON sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY sessions_insert ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY sessions_delete ON sessions FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================
-- REFRESH TOKENS
-- ============================================
CREATE POLICY refresh_tokens_select ON refresh_tokens FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY refresh_tokens_insert ON refresh_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY refresh_tokens_delete ON refresh_tokens FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================
-- LOGIN ATTEMPTS (admin view only)
-- ============================================
CREATE POLICY login_attempts_select ON login_attempts FOR SELECT
  USING (is_admin());

CREATE POLICY login_attempts_insert ON login_attempts FOR INSERT
  WITH CHECK (true);  -- Allow from Edge Functions
