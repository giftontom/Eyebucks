-- 038_hero_slides_bunny_urls.sql
-- Repoint the seeded hero_slides images from fragile relative /public paths to
-- absolute Bunny CDN URLs (the exact same images, uploaded to the site-images
-- Bunny zone under hero/). Origin-independent → visible on preview, dev, prod,
-- and in the admin image preview alike.
--
-- Idempotent + safe: only updates rows whose image is STILL a relative path, so
-- a later admin replacement (a different Bunny URL) is never overwritten.

UPDATE public.site_content
  SET metadata = jsonb_set(metadata, '{image}', '"https://eyebuckz.b-cdn.net/hero/premium_banner_1.webp"')
  WHERE section = 'hero_slides' AND title = 'Masterclass Series'    AND metadata->>'image' LIKE '/%';

UPDATE public.site_content
  SET metadata = jsonb_set(metadata, '{image}', '"https://eyebuckz.b-cdn.net/hero/premium_banner_2.webp"')
  WHERE section = 'hero_slides' AND title = 'Expert-Led Courses'    AND metadata->>'image' LIKE '/%';

UPDATE public.site_content
  SET metadata = jsonb_set(metadata, '{image}', '"https://eyebuckz.b-cdn.net/hero/banner_real_1.webp"')
  WHERE section = 'hero_slides' AND title = 'Behind the Lens'       AND metadata->>'image' LIKE '/%';

UPDATE public.site_content
  SET metadata = jsonb_set(metadata, '{image}', '"https://eyebuckz.b-cdn.net/hero/banner_real_2.webp"')
  WHERE section = 'hero_slides' AND title = 'Professional Workflow' AND metadata->>'image' LIKE '/%';
