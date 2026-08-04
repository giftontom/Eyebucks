-- Migration: 039_digital_assets
-- Description: Digital Assets feature — downloadable products (LUTs, presets, SFX,
--              templates, PDFs) sold one-time in INR. Mirrors the courses/enrollments
--              model but lighter (no modules/lessons/progress/certificates).
--              See ADR-008 (docs/adr/008-digital-assets-feature.md).
-- Created: 2026-06-22

-- ============================================
-- ENUMs
-- ============================================
-- Reuses existing `course_status` (PUBLISHED|DRAFT) for asset status and
-- `enrollment_status` (ACTIVE|EXPIRED|REVOKED|PENDING) for purchase status.
DO $$ BEGIN
  CREATE TYPE asset_file_type AS ENUM
    ('LUT', 'PRESET', 'SFX', 'MUSIC', 'OVERLAY', 'PROJECT', 'PDF', 'TEMPLATE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_license AS ENUM ('PERSONAL', 'COMMERCIAL', 'EXTENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- DIGITAL_ASSETS (the product)
-- ============================================
-- SECURITY: `storage_path` points at the PRIVATE Bunny zone and must NEVER be
-- exposed to the client. RLS cannot hide columns, so the storefront API selects an
-- explicit column list that omits storage_path; only the asset-download-url Edge
-- Function (service_role) reads it to mint a short-lived signed URL.
CREATE TABLE IF NOT EXISTS public.digital_assets (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug           TEXT UNIQUE NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  price          INTEGER NOT NULL,                 -- paise (0 = free lead-magnet)
  compare_price  INTEGER,                          -- optional strike-through "MRP" (paise)
  file_type      asset_file_type NOT NULL,
  license        asset_license NOT NULL DEFAULT 'PERSONAL',
  storage_path   TEXT NOT NULL,                    -- private Bunny zone path (server-only)
  file_size      BIGINT,                           -- bytes
  file_ext       TEXT,                             -- 'zip','cube','pdf', ...
  thumbnail      TEXT NOT NULL DEFAULT '',         -- public preview image (CMS zone)
  preview_url    TEXT,                             -- optional watermarked/low-res sample (public)
  version        TEXT NOT NULL DEFAULT 'v1',
  status         course_status NOT NULL DEFAULT 'DRAFT',
  download_count INTEGER NOT NULL DEFAULT 0,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,         -- soft-delete (mirrors courses)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_assets_slug      ON public.digital_assets(slug);
CREATE INDEX IF NOT EXISTS idx_digital_assets_status    ON public.digital_assets(status);
CREATE INDEX IF NOT EXISTS idx_digital_assets_file_type ON public.digital_assets(file_type);

-- ============================================
-- ASSET_PURCHASES (the entitlement — mirrors enrollments)
-- ============================================
-- STRICTER than enrollments: NO client INSERT/UPDATE. Only the service_role
-- checkout Edge Function (bypasses RLS) and admins may write — prevents a user
-- from self-granting a free purchase.
CREATE TABLE IF NOT EXISTS public.asset_purchases (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asset_id           TEXT NOT NULL REFERENCES public.digital_assets(id) ON DELETE CASCADE,
  status             enrollment_status NOT NULL DEFAULT 'ACTIVE',
  payment_id         TEXT,
  order_id           TEXT,
  amount             INTEGER DEFAULT 0,            -- paise actually paid (after coupon)
  download_count     INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  purchased_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_purchases_user_asset_unique UNIQUE (user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_purchases_user_id  ON public.asset_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_purchases_asset_id ON public.asset_purchases(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_purchases_order_id ON public.asset_purchases(order_id);

-- ============================================
-- PAYMENTS: extend to cover digital assets as well as courses
-- ============================================
-- Make course_id nullable and add asset_id; a payment targets EXACTLY ONE product.
ALTER TABLE public.payments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS asset_id TEXT REFERENCES public.digital_assets(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_one_product_target
    CHECK (num_nonnulls(course_id, asset_id) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payments_asset_id ON public.payments(asset_id);

-- ============================================
-- RLS — digital_assets
-- ============================================
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;

-- Public read of PUBLISHED + not-deleted; admins see all (incl. drafts/archived).
CREATE POLICY "digital_assets_select" ON public.digital_assets
  FOR SELECT USING (
    (status = 'PUBLISHED' AND deleted_at IS NULL) OR is_admin()
  );

-- Only admins create/update/delete.
CREATE POLICY "digital_assets_insert" ON public.digital_assets
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "digital_assets_update" ON public.digital_assets
  FOR UPDATE USING (is_admin());
CREATE POLICY "digital_assets_delete" ON public.digital_assets
  FOR DELETE USING (is_admin());

-- ============================================
-- RLS — asset_purchases
-- ============================================
ALTER TABLE public.asset_purchases ENABLE ROW LEVEL SECURITY;

-- Users see their own purchases; admins see all.
CREATE POLICY "asset_purchases_select" ON public.asset_purchases
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- NO user write: only admins (and service_role, which bypasses RLS) may grant.
CREATE POLICY "asset_purchases_insert" ON public.asset_purchases
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "asset_purchases_update" ON public.asset_purchases
  FOR UPDATE USING (is_admin());
CREATE POLICY "asset_purchases_delete" ON public.asset_purchases
  FOR DELETE USING (is_admin());

-- ============================================
-- updated_at triggers (reuse existing update_updated_at())
-- ============================================
CREATE TRIGGER digital_assets_updated_at
  BEFORE UPDATE ON public.digital_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER asset_purchases_updated_at
  BEFORE UPDATE ON public.asset_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PRIVATE STORAGE BUCKET for asset files
-- ============================================
-- Chosen over a public Bunny zone because Supabase Storage natively supports
-- (a) createSignedUploadUrl — large direct browser uploads with NO service key on
-- the client, and (b) createSignedUrl — short-lived, entitlement-gated downloads.
-- public=false => the only way to read an object is a signed URL minted by the
-- service-role asset-download-url Edge Function AFTER an entitlement check.
-- 500 MB cap; all MIME types allowed (validated by extension in the upload fn).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('digital-assets', 'digital-assets', false, 524288000, NULL)
ON CONFLICT (id) DO NOTHING;

-- No storage.objects RLS policies: all access flows through service-role Edge
-- Functions (upload token + signed download URL), which bypass storage RLS.
-- Without any policy, anon/authenticated clients have NO direct object access.
