-- 037_seed_hero_slides.sql
-- Seed the hero carousel's 4 current banner images as EDITABLE hero_slides rows,
-- so admins see them pre-loaded in the CMS (and can replace/reorder/remove) while
-- the live site shows the exact same images. metadata.image points at the existing
-- /public assets (same-origin); replacing a slide swaps in a Bunny CDN URL.
--
-- Idempotent: guarded by WHERE NOT EXISTS on (section, title) so re-runs / existing
-- rows are never duplicated. If all rows are later deleted, HeroCarousel falls back
-- to its built-in DEFAULT_SLIDES (the same images).

INSERT INTO public.site_content (section, title, body, order_index, metadata, is_active)
SELECT v.section, v.title, '', v.order_index, v.metadata::jsonb, true
FROM (VALUES
  ('hero_slides', 'Masterclass Series',     1, '{"image":"/premium_banner_1.webp"}'),
  ('hero_slides', 'Expert-Led Courses',     2, '{"image":"/premium_banner_2.webp"}'),
  ('hero_slides', 'Behind the Lens',        3, '{"image":"/banner_real_1.webp"}'),
  ('hero_slides', 'Professional Workflow',  4, '{"image":"/banner_real_2.webp"}')
) AS v(section, title, order_index, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content sc
  WHERE sc.section = v.section AND sc.title = v.title
);
