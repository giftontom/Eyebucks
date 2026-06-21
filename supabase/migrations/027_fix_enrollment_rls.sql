-- ─── Fix enrollment RLS double-coverage ─────────────────────────────────────
-- Migration 018 attempted to DROP "Users see own active enrollments" but the
-- original policy in 003 is named "enrollments_select". The DROP was a no-op,
-- leaving both policies active. PostgreSQL combines permissive policies with OR,
-- so the original policy (user_id = auth.uid() OR is_admin()) still allows
-- users to see EXPIRED, REVOKED, and PENDING enrollments.
--
-- This migration drops the original permissive policy so only the stricter
-- 018 policy (ACTIVE + non-expired only) applies for user-scoped reads.
-- Admins are unaffected since is_admin() is handled within the 018 policy's
-- USING clause: the 018 policy only applies to user_id = auth.uid(), so
-- admins querying other users' enrollments won't hit it. We add an admin
-- all-access policy to restore full admin visibility.

DROP POLICY IF EXISTS enrollments_select ON enrollments;

-- Ensure admins retain full visibility (018's policy is user-scoped only)
DROP POLICY IF EXISTS enrollments_admin_all ON enrollments;
CREATE POLICY enrollments_admin_all ON enrollments
  FOR SELECT
  USING (is_admin());
