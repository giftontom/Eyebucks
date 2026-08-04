-- 036_hero_slides_section.sql
-- Add 'hero_slides' to the site_content.section CHECK so the hero carousel's
-- banner slides become CMS-managed (one row per slide; metadata.image = uploaded
-- image, title = slide caption). Falls back to hardcoded /public slides when empty.
--
-- Strict superset of 033's list (+ 'hero_slides'); no existing row can violate it.
-- NUMBERING: 033 (cms) + 034/035 (lessons) are applied on remote → next is 036.
-- Keep this list in sync with SECTION_SCHEMAS in pages/admin/content/sectionSchemas.ts.

ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_section_check;

ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_section_check
  CHECK (section IN (
    'faq', 'testimonial', 'showcase', 'banner', 'settings',
    'creators', 'instructors', 'value_cards',
    'hero', 'hero_slides', 'social_proof', 'featured_copy', 'how_it_works',
    'value_props_copy', 'instructors_copy', 'community_copy', 'creators_copy',
    'pricing_copy', 'closing'
  ));
