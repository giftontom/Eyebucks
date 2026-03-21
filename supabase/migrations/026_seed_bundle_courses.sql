-- Migration: 026_seed_bundle_courses
-- Description: Ensure bundle_courses links exist for c1-masterclass → c2, c3, c4.
--              seed.sql is not run on remote DB so these rows may be missing.
-- Created: 2026-03-21

INSERT INTO bundle_courses (bundle_id, course_id, order_index) VALUES
  ('c1-masterclass', 'c2-scripting',      0),
  ('c1-masterclass', 'c3-cinematography', 1),
  ('c1-masterclass', 'c4-editing',        2)
ON CONFLICT (bundle_id, course_id) DO NOTHING;
