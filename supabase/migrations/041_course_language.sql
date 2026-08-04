-- Migration: 041_course_language
-- Description: Course language support (Malayalam + English). Each language is its
--   own course row tagged with `language`; sibling variants of the same concept may
--   optionally be linked by `course_group_id`. Adds a per-user `preferred_language`
--   that drives the storefront language switch.
-- Created: 2026-06-23

-- ============================================
-- ENUM: course_language
-- ============================================
-- Guarded so re-running the migration is idempotent (the project applies SQL via
-- the Management API, not `supabase db reset`, so CREATE TYPE has no IF NOT EXISTS).
DO $$ BEGIN
  CREATE TYPE course_language AS ENUM ('EN', 'ML');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- courses: language + optional sibling-group link
-- ============================================
-- Existing rows backfill to 'EN' via the NOT NULL DEFAULT.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS language course_language NOT NULL DEFAULT 'EN',
  ADD COLUMN IF NOT EXISTS course_group_id TEXT;

COMMENT ON COLUMN courses.language IS 'Content language of this course. Storefront lists only courses matching the visitor''s selected language.';
COMMENT ON COLUMN courses.course_group_id IS 'Optional loose key linking the same course concept across languages (e.g. EN + ML rows share one group). Not a FK.';

-- Catalog filters by language on non-deleted rows.
CREATE INDEX IF NOT EXISTS idx_courses_language
  ON courses (language)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_courses_group
  ON courses (course_group_id)
  WHERE course_group_id IS NOT NULL;

-- Integrity: a course group holds at most ONE row per language, so the
-- "also available in <language>" link can never resolve to two ambiguous siblings.
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_group_language
  ON courses (course_group_id, language)
  WHERE course_group_id IS NOT NULL;

-- ============================================
-- users: preferred storefront language
-- ============================================
-- Nullable: NULL = the user has never explicitly chosen, so the client falls back
-- to localStorage → navigator.language → 'EN'.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language course_language;

COMMENT ON COLUMN users.preferred_language IS 'User''s chosen storefront content language. NULL = not set (client resolves from device/browser).';

-- ============================================
-- RLS: no policy changes required.
-- Adding a column does not change row visibility. Public reads still gate on
-- status = 'PUBLISHED'; language is an app-level query filter, not a security
-- boundary. `users.preferred_language` is covered by the existing
-- users_update_own / users_select_own policies (own-row access).
-- ============================================
