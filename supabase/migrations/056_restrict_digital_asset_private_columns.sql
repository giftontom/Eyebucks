-- 056_restrict_digital_asset_private_columns.sql
-- Correctly restrict the private digital_assets columns from public clients.
--
-- 055 tried REVOKE SELECT (storage_path, external_url) but it was a no-op:
-- Supabase grants TABLE-level SELECT to anon/authenticated, and a column-level
-- REVOKE cannot carve a column out of a table-wide grant. The working pattern is
-- to revoke the table grant and grant back only the safe columns.
--
-- Sensitive columns:
--   storage_path — the Cloudflare R2 object key. Never selected by any client;
--                  only service_role Edge Functions resolve it. Withheld from
--                  BOTH anon and authenticated.
--   external_url — a bearer link to the paid file (migration 048, the Google
--                  Drive delivery option). The storefront never reads it; the
--                  ADMIN editor reads it as `authenticated`, so it is granted to
--                  authenticated but NOT anon. (Fully restricting it to admins
--                  needs the admin read routed through a service_role path — a
--                  tracked follow-up; this closes the public no-login vector.)
--
-- Safe columns = every column except storage_path/external_url. The app's
-- STOREFRONT_COLUMNS / ADMIN_COLUMNS lists already select only these, so this is
-- transparent to the client. NOTE: a future ADD COLUMN is NOT auto-granted here
-- and must be added to the grant below if the storefront needs to read it — an
-- intentional fail-safe-closed default for a table with private columns.
--
-- SELECT only: INSERT/UPDATE/DELETE grants are untouched, so admin writes and
-- the insert/update ... select(ADMIN_COLUMNS) round-trips are unaffected.
-- service_role and postgres retain full access.

REVOKE SELECT ON public.digital_assets FROM anon, authenticated;

GRANT SELECT (
  id, slug, title, description, price, compare_price, file_type, license,
  file_size, file_ext, thumbnail, preview_url, version, status,
  download_count, deleted_at, created_at, updated_at
) ON public.digital_assets TO anon, authenticated;

-- Admin editor reads external_url as `authenticated`.
GRANT SELECT (external_url) ON public.digital_assets TO authenticated;

-- Verify:
--   SELECT has_column_privilege('anon','public.digital_assets','storage_path','SELECT') AS anon_sp,   -- f
--          has_column_privilege('anon','public.digital_assets','external_url','SELECT')  AS anon_ext,  -- f
--          has_column_privilege('anon','public.digital_assets','title','SELECT')         AS anon_title,-- t
--          has_column_privilege('authenticated','public.digital_assets','storage_path','SELECT') AS au_sp,   -- f
--          has_column_privilege('authenticated','public.digital_assets','external_url','SELECT')  AS au_ext;  -- t
