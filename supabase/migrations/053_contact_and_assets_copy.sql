-- 053_contact_and_assets_copy.sql
-- Two more hardcoded pages become CMS-editable:
--   contact_copy  — the /contact page (heading, intro, the email + YouTube
--                   cards, and the "Frequently Asked" bullets)
--   assets_copy   — the /assets digital-asset shop heading/subheading
--
-- Both were hardcoded with no CMS section. Singletons; the frontend falls back
-- to the verbatim previous copy until a row exists, so the pages look identical
-- before and after.
--
-- NOTE: like 046/049/050/052, this redefines the whole allowed-section list.
-- Forward-only, in order — never replay an older constraint migration after it.
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
    'footer_links', 'course_includes', 'about_page', 'catalog_copy',
    'contact_copy', 'assets_copy'
  ));

INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT 'contact_copy',
       'Contact Us',
       'Have a question about a course, payment, or your account? We''re here to help.',
       jsonb_build_object(
         'eyebrow', 'Get in Touch',
         'email', 'support@eyebuckz.com',
         'emailNote', 'For course access, billing, or general questions.',
         'youtubeUrl', 'https://youtube.com/@eyebuckz',
         'youtubeNote', 'Free tutorials, previews, and community updates.',
         'faqItems', jsonb_build_array(
           'Access issues: Email us with your order ID and we''ll restore access within 24 hours.',
           'Refunds: We offer refunds within 7 days of purchase if you haven''t completed more than 20% of the course.',
           'Certificates: Certificates are auto-generated when you complete 100% of a course.'
         )
       ),
       0, true
WHERE NOT EXISTS (SELECT 1 FROM public.site_content WHERE section = 'contact_copy');

INSERT INTO public.site_content (section, title, body, metadata, order_index, is_active)
SELECT 'assets_copy',
       'Digital Assets',
       'LUTs, presets, sound packs, templates and project files for your craft.',
       jsonb_build_object('eyebrow', 'Shop'),
       0, true
WHERE NOT EXISTS (SELECT 1 FROM public.site_content WHERE section = 'assets_copy');

-- Verify:
--   SELECT section, title FROM public.site_content WHERE section IN ('contact_copy','assets_copy');
