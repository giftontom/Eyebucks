-- Fix 1: Add 'banner' to site_content section CHECK constraint
-- Migration 006 only allows ('faq', 'testimonial', 'showcase'), but the
-- AnnouncementBanner feature needs section = 'banner'.

ALTER TABLE public.site_content DROP CONSTRAINT site_content_section_check;
ALTER TABLE public.site_content ADD CONSTRAINT site_content_section_check
  CHECK (section IN ('faq', 'testimonial', 'showcase', 'banner'));
