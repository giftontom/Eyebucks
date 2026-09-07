-- ============================================================
--  RUN THIS in the Supabase SQL editor  →  Project pdengtcdtszpvwhedzxn
--  Migration 050 — adds the About page CMS section.
--
--  Safe to run: additive only. It widens the allowed-section list,
--  then moves the About text that is currently stranded inside a
--  footer link's body into a proper about_page row. Guarded so
--  re-running cannot overwrite later edits.
--
--  Paste the WHOLE file. Expected result: no errors, and the two
--  verification queries at the bottom return the About copy.
-- ============================================================

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


-- ============================================================
--  Read-only. Nothing below changes anything.
--
--  Why the announcement band was blank on the home page: an active
--  banner row with no title renders as a coloured empty stripe. The
--  deployed code now skips such rows, so the blank space is already
--  gone — this just shows you whether that is what happened, and
--  lets you put real text back if you did want an announcement.
-- ============================================================
SELECT id,
       COALESCE(NULLIF(TRIM(title), ''), '(no title)') AS title,
       COALESCE(NULLIF(TRIM(body),  ''), '(no body)')  AS body,
       order_index,
       is_active
  FROM public.site_content
 WHERE section = 'banner'
 ORDER BY order_index, id;
