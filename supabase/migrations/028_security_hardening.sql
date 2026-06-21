-- Migration 028: Security Hardening
-- Restricts enrollments INSERT to admin-only so users cannot self-enroll
-- by crafting a direct Supabase client call with status='ACTIVE'.
-- Edge Functions (checkout-verify, manualEnrollUser) use service_role
-- which bypasses RLS entirely, so this is safe.
--
-- Also tightens users SELECT so users can only read their own profile.
--
-- Exposes a SECURE public_reviews view to securely display user names
-- and avatars on course reviews without exposing emails, phone numbers,
-- or roles of user profiles publicly.

-- ─── Enrollments INSERT: admin-only (service_role is unaffected by RLS) ──────
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
CREATE POLICY enrollments_insert ON public.enrollments
  FOR INSERT
  WITH CHECK (is_admin());

-- ─── Users SELECT: own record + admin only ────────────────────────────────────
DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_select_public_name ON public.users;

CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY users_select_admin ON public.users
  FOR SELECT
  USING (is_admin());

-- ─── Public Reviews VIEW: safe public projection ──────────────────────────────
-- Create a secure view to join reviews and user public profile fields (name, avatar).
-- Standard views execute with the creator/owner privileges (postgres/service_role),
-- allowing them to bypass underlying table RLS, while only exposing non-sensitive columns.
DROP VIEW IF EXISTS public.public_reviews;
CREATE OR REPLACE VIEW public.public_reviews AS
SELECT
  r.id,
  r.user_id,
  r.course_id,
  r.rating,
  r.comment,
  r.helpful,
  r.created_at,
  r.updated_at,
  u.name AS user_name,
  u.avatar AS user_avatar
FROM public.reviews r
LEFT JOIN public.users u ON r.user_id = u.id;

-- Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public.public_reviews TO anon, authenticated;
