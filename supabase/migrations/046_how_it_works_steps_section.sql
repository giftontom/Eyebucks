-- 046_how_it_works_steps_section.sql
-- Add 'how_it_works_steps' to the site_content.section CHECK so the three step
-- cards in the "How It Works" band become CMS-managed (one row per step;
-- title = step title, body = description, metadata.icon = icon key). Until now
-- only the band's HEADER was editable ('how_it_works'), while the steps
-- themselves were a hardcoded STEPS const in HowItWorksSection.tsx — the one
-- landing list with no CMS key. Falls back to the hardcoded steps when empty.
--
-- Strict superset of 036's list (+ 'how_it_works_steps'); no existing row can
-- violate it.
-- Keep this list in sync with SECTION_SCHEMAS in pages/admin/content/sectionSchemas.ts.

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
    'pricing_copy', 'closing'
  ));

-- Seed the three steps the storefront already renders, so an admin opening
-- /admin/content SEES them (and can edit them) instead of an absent group —
-- the list only renders sections that have rows. Text is copied verbatim from
-- DEFAULT_STEPS in HowItWorksSection.tsx, so the page is unchanged either way.
-- Idempotent: skipped entirely once the section has any row.
INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT * FROM (VALUES
  (
    'how_it_works_steps',
    'Browse Courses',
    'Explore our catalog of filmmaking courses — from cinematography basics to advanced color grading. Every course includes real project files and RAW footage.',
    '{"icon": "search"}'::jsonb,
    0,
    true
  ),
  (
    'how_it_works_steps',
    'Enroll & Pay',
    'Secure checkout via Razorpay. Instant access after payment. 30-day money-back guarantee if you''re not satisfied.',
    '{"icon": "card"}'::jsonb,
    1,
    true
  ),
  (
    'how_it_works_steps',
    'Learn & Get Certified',
    'Watch at your own pace, track progress, and earn a verifiable certificate when you complete a course. Lifetime access to all content.',
    '{"icon": "award"}'::jsonb,
    2,
    true
  )
) AS seed(section, title, body, metadata, order_index, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE section = 'how_it_works_steps'
);

-- Verify:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'site_content_section_check';
--   SELECT order_index, title FROM public.site_content
--   WHERE section = 'how_it_works_steps' ORDER BY order_index;
