-- 049_footer_links_and_course_includes.sql
-- Two more hardcoded lists become CMS-managed, reported the same way the
-- How It Works steps were (046): visible on the site, findable nowhere in the
-- admin.
--
--   footer_links     — the footer's link columns (one row per link;
--                      metadata.group = column heading, metadata.url = target)
--   course_includes  — the course page's "This course includes" bullets
--                      (one row per bullet; metadata.icon = icon key; the
--                      lesson/course-count bullet stays computed in code)
--
-- Strict superset of 046's list; no existing row can violate it.
-- Keep in sync with SECTION_SCHEMAS in pages/admin/content/sectionSchemas.ts.

ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_section_check;

ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_section_check
  CHECK (section IN (
    'faq', 'testimonial', 'showcase', 'banner', 'settings',
    'creators', 'instructors', 'value_cards',
    'hero', 'hero_slides', 'social_proof', 'featured_copy',
    'how_it_works', 'how_it_works_steps',
    'value_props_copy', 'instructors_copy', 'community_copy', 'creators_copy',
    'pricing_copy', 'closing',
    'footer_links', 'course_includes'
  ));

-- Seed both sections with the exact content the site already renders, so the
-- admin sees editable rows rather than empty groups, and the pages look
-- identical before and after. Idempotent: skipped once a section has any row.

INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT * FROM (VALUES
  ('footer_links', 'Filmmaking',       '', '{"group": "Courses", "url": "/courses"}'::jsonb, 0, true),
  ('footer_links', 'Video Editing',    '', '{"group": "Courses", "url": "/courses"}'::jsonb, 1, true),
  ('footer_links', 'Photography',      '', '{"group": "Courses", "url": "/courses"}'::jsonb, 2, true),
  ('footer_links', 'Business',         '', '{"group": "Courses", "url": "/courses"}'::jsonb, 3, true),
  ('footer_links', 'About Us',         '', '{"group": "Company", "url": "/about"}'::jsonb, 4, true),
  ('footer_links', 'YouTube',          '', '{"group": "Company", "url": "https://youtube.com/@eyebuckz"}'::jsonb, 5, true),
  ('footer_links', 'Contact Us',       '', '{"group": "Support", "url": "/contact"}'::jsonb, 6, true),
  ('footer_links', 'Privacy Policy',   '', '{"group": "Support", "url": "/privacy"}'::jsonb, 7, true),
  ('footer_links', 'Terms of Service', '', '{"group": "Support", "url": "/terms"}'::jsonb, 8, true)
) AS seed(section, title, body, metadata, order_index, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE section = 'footer_links'
);

INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT * FROM (VALUES
  ('course_includes', 'Full lifetime access',        '', '{"icon": "infinity"}'::jsonb,   0, true),
  ('course_includes', 'Access on mobile & desktop',  '', '{"icon": "smartphone"}'::jsonb, 1, true),
  ('course_includes', 'Certificate of completion',   '', '{"icon": "award"}'::jsonb,      2, true),
  ('course_includes', 'Learn at your own pace',      '', '{"icon": "clock"}'::jsonb,      3, true),
  ('course_includes', 'Community & support access',  '', '{"icon": "star"}'::jsonb,       4, true)
) AS seed(section, title, body, metadata, order_index, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE section = 'course_includes'
);

-- Verify:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'site_content_section_check';
--   SELECT section, count(*) FROM public.site_content
--   WHERE section IN ('footer_links','course_includes') GROUP BY section;
