-- 052_catalog_copy_section.sql
-- Makes the course catalog page's heading and subheading editable in the CMS.
--
-- The /courses page ("Masterclass Catalog" / "Choose your path. From
-- cinematography to color grading.") was hardcoded in CatalogSection.tsx with
-- no CMS section, so an admin had no way to change it. This adds a singleton
-- `catalog_copy` section for that copy.
--
-- NOTE: like 046/049/050, this redefines the whole allowed-section list rather
-- than adding to it. Forward-only, in order — never replay an older constraint
-- migration after this one.
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
    'footer_links', 'course_includes', 'about_page', 'catalog_copy'
  ));

-- Seed with the exact copy the page already shows, so the catalog looks
-- identical before and after and the admin sees an editable row rather than an
-- empty group. Idempotent: skipped once the section has any row.
INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT 'catalog_copy',
       'Masterclass Catalog',
       'Choose your path. From cinematography to color grading.',
       '{}'::jsonb, 0, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE section = 'catalog_copy'
);

-- Verify:
--   SELECT title, body FROM public.site_content WHERE section = 'catalog_copy';
