-- 033_cms_section_keys.sql
-- CMS fix (Phase 1): widen site_content.section CHECK to the full set of keys the
-- frontend actually reads/writes, in ONE authoritative migration.
--
-- ROOT CAUSE: the constraint (006 -> 013 -> 030) allowed only
--   ('faq','testimonial','showcase','banner','settings').
-- But the admin editor offers 'creators' (errors on save) and the storefront
-- reads 'instructors' / 'value_cards' (silently return empty -> hardcoded
-- fallback). The copy->CMS refactor (Phase 4) additionally introduces copy
-- singleton keys (hero, how_it_works, pricing_copy, ...). All of them are listed
-- here NOW so no second constraint migration is ever needed.
--
-- NUMBERING: next free number is 033. Remote schema_migrations is at 032; local
-- files skip 030/031 (authz hardening — applied to remote via the Management API,
-- never committed locally). The new key list is a strict SUPERSET of the current
-- constraint, so no existing row can violate the re-added constraint.
--
-- SINGLE SOURCE OF TRUTH: this list MUST stay in sync with the SECTION_SCHEMAS
-- registry in pages/admin/content/sectionSchemas.ts (Phase 3). Keep both in lockstep.
--
-- RLS: no change. site_content_public_read (is_active) and site_content_admin_all
-- (is_admin()) are section-agnostic — verified against remote dev.

ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_section_check;

ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_section_check
  CHECK (section IN (
    -- existing (006 / 013 / 030)
    'faq',
    'testimonial',
    'showcase',
    'banner',
    'settings',
    -- previously-broken: read/written by code, were rejected by the constraint
    'creators',
    'instructors',
    'value_cards',
    -- copy singletons introduced by the copy -> CMS refactor (Phase 4)
    'hero',
    'social_proof',
    'featured_copy',
    'how_it_works',
    'value_props_copy',
    'instructors_copy',
    'community_copy',
    'creators_copy',
    'pricing_copy',
    'closing'
  ));

-- Verify (manual): SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'site_content_section_check';
-- No seeds: every consumer falls back to its hardcoded default when the CMS row
-- set is empty, so leaving these sections empty preserves the current live UI
-- exactly. Admins populate them via the editor (Phase 3).
