-- 050_about_page_section.sql
-- Adds `about_page` and rescues content that ended up in the wrong row.
--
-- What happened: 049 seeded a `footer_links` row titled "About Us" (a menu link
-- pointing at /about). At that moment the frontend did not yet know the
-- footer_links schema, so the admin editor fell back to its generic
-- Section/Title/Body form — and an admin looking for "where do I edit the About
-- page" reasonably pasted the About page copy into that row's Body. When the
-- schema deployed, footer_links rendered as Link label + Column + URL with no
-- Body field (a footer link has no body), and the text became unreachable.
--
-- The underlying gap is the real bug: /about, /privacy, /terms and /contact are
-- hardcoded and have no CMS section at all, so there was nowhere correct to put
-- it. This adds one for /about and moves the stranded text there.

-- NOTE: like 046 and 049, this redefines the whole allowed-section list rather
-- than adding to it. Consequence: never replay an older constraint migration
-- after this one — it would narrow the list back and fail against about_page
-- rows. Forward-only, in order.
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
    'footer_links', 'course_includes', 'about_page'
  ));

-- Rescue: if a footer_links row has body text, that text is About page copy the
-- admin could not otherwise reach. Move it into about_page, then clear the body
-- so the footer row is just a link again.
--
-- Guarded on about_page being empty so re-running cannot overwrite later edits.
INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT
  'about_page',
  'About Eyebuckz',
  fl.body,
  '{"pill": "Our Mission"}'::jsonb,
  0,
  true
FROM public.site_content fl
WHERE fl.section = 'footer_links'
  AND COALESCE(TRIM(fl.body), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.site_content WHERE section = 'about_page')
ORDER BY LENGTH(fl.body) DESC
LIMIT 1;

UPDATE public.site_content
   SET body = ''
 WHERE section = 'footer_links'
   AND COALESCE(TRIM(body), '') <> '';

-- Fall back to the page's hardcoded copy if there was nothing to rescue, so the
-- section is never an empty group in the admin.
INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT
  'about_page',
  'About Eyebuckz',
  'Eyebuckz is a filmmaker-built learning platform for creators who are serious about their craft. '
  || 'We bridge the gap between free YouTube tutorials and expensive film school — giving you '
  || 'structured, practical education with real industry workflows.',
  '{"pill": "Our Mission"}'::jsonb,
  0,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.site_content WHERE section = 'about_page');

-- Verify:
--   SELECT title, LEFT(body, 80) FROM public.site_content WHERE section = 'about_page';
--   SELECT title, body FROM public.site_content WHERE section = 'footer_links' ORDER BY order_index;
