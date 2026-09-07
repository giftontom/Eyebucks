-- 048_asset_external_url.sql
-- Let a digital asset be delivered by an external link (e.g. Google Drive)
-- instead of a file uploaded to the private storage zone.
--
-- SECURITY — read before using this.
--
-- The uploaded-file path is entitlement-gated end to end: asset-download-url
-- checks for an ACTIVE asset_purchase and then mints a ~5-minute presigned URL,
-- so a leaked link dies almost immediately and every fetch is counted.
--
-- An external link cannot offer any of that. It is a bearer credential: whoever
-- holds it has the file. Handing it to a buyer means
--   * they can reshare it freely, and it never expires;
--   * revoking a refunded buyer's access is impossible without rotating the
--     link for everyone;
--   * `download_count` stops meaning anything for that asset — we count the
--     hand-out, not the download.
-- The entitlement check still runs before we hand the link over, so it is not
-- public; it is "gated once, then permanent". Use it for low-value or
-- deliberately shareable material, not for the paid catalog's crown jewels.
-- The admin editor states this at the point of choosing.
--
-- `external_url` is exposed to NOBODY except the entitlement-gated Edge
-- Function and admins: it is absent from STOREFRONT_COLUMNS in
-- services/api/digitalAssets.api.ts, exactly like storage_path.

-- storage_path was NOT NULL because an uploaded file was the only delivery
-- mechanism. An externally-hosted asset has no storage path at all.
ALTER TABLE public.digital_assets
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.digital_assets
  ADD COLUMN IF NOT EXISTS external_url TEXT;

COMMENT ON COLUMN public.digital_assets.external_url IS
  'Externally-hosted download (e.g. Google Drive share link). Server-only, like storage_path. Bearer URL: gated once at hand-out, then permanent — see migration 048.';

-- Exactly one delivery source. Both set would make the download path ambiguous;
-- neither set would be a product a buyer cannot download.
-- Existing rows all have storage_path NOT NULL and external_url NULL, so they
-- satisfy this as-is.
ALTER TABLE public.digital_assets
  DROP CONSTRAINT IF EXISTS digital_assets_one_delivery_source;

ALTER TABLE public.digital_assets
  ADD CONSTRAINT digital_assets_one_delivery_source
  CHECK (num_nonnulls(storage_path, external_url) = 1);

-- Verify:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'digital_assets_one_delivery_source';
--   SELECT id, slug,
--          storage_path IS NOT NULL AS has_file,
--          external_url IS NOT NULL AS has_link
--   FROM public.digital_assets;
