# Digital Assets Go-Live Runbook

> **Last updated:** 2026-06-22 | **Status:** Draft | **Scope:** Digital Assets feature (ADR-008)
> **On-call:** Check Slack #ops | **Escalation:** core maintainers

## Overview

Takes the **Digital Assets** feature (downloadable products — LUTs, presets, SFX, templates,
PDFs) from "built, files-only" to live. All feature code is committed on branch
`ui-ux-phase-0-2` but **nothing has been applied to the database or deployed**. This runbook is
the apply → deploy → review → verify sequence, plus rollback.

Architecture context: **ADR-008** (`docs/adr/008-digital-assets-feature.md`).

⚠️ **Shared DB caveat:** dev and prod currently share one Supabase project
(`pdengtcdtszpvwhedzxn`). Applying these migrations affects both. Pre-launch this is acceptable
(test users only) — confirm that's still true before running.

⚠️ **Money path:** the checkout Edge Functions are changed. The security review (Step 4) is a
**mandatory gate** before real payments flow.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Procedure](#procedure)
- [Rollback](#rollback)
- [Verification](#verification)

---

## Prerequisites

- [ ] Branch `ui-ux-phase-0-2` checked out; `npm run type-check`, `npm run lint`, `npm test` all green.
- [ ] Supabase **access token** (`sbp_…`) + **project ref** `pdengtcdtszpvwhedzxn` available (see team vault / `memory/`). Do NOT paste secrets into commits or this doc.
- [ ] `supabase` CLI logged in (`supabase login --token <token>` for non-TTY).
- [ ] Confirm no NEW secrets are required:
  - Asset files live in a **private Supabase Storage** bucket — uses the project service-role key (already present). **No new Bunny secrets.**
  - Razorpay keys (`RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`), `APP_URL`, and Resend are already set (used by the existing course checkout).
- [ ] A staging/dev preview to smoke-test against (e.g. `ui-ux-phase-0-2.eyebucks-dev.pages.dev`).
- [ ] **Backup first:** run `/backup-database` (or dump `digital_assets`, `asset_purchases`, `payments`, `coupon_uses`) before applying.

## Procedure

### Step 1: Apply migrations 039 + 040

Docker is not available locally, so apply via the **Supabase Management API** (the Docker-free SQL
channel) or `supabase db push`. Apply **039 first, then 040** (040 references `digital_assets`).

- `039_digital_assets.sql` — `digital_assets` + `asset_purchases` tables, `asset_file_type` /
  `asset_license` ENUMs, RLS, `payments.asset_id` (+ `course_id` made nullable + exactly-one
  CHECK), and the **private `digital-assets` Storage bucket** (500 MB, `public=false`).
- `040_coupons_on_assets.sql` — `coupon_uses` asset support + `apply_asset_coupon` RPC.

```bash
# Option A — Management API (Docker-free). Dry-run each first inside BEGIN…ROLLBACK to validate.
# POST https://api.supabase.com/v1/projects/<ref>/database/query  { "query": "<file contents>" }

# Option B — CLI
supabase db push   # applies pending migrations
```

**Sanity after apply:**
```sql
select to_regclass('public.digital_assets'), to_regclass('public.asset_purchases');
select id, public, file_size_limit from storage.buckets where id = 'digital-assets';
select proname from pg_proc where proname in ('apply_asset_coupon');
-- payments XOR check holds for existing rows:
select count(*) from payments where num_nonnulls(course_id, asset_id) <> 1;  -- expect 0
```

> If the `storage.buckets` INSERT in 039 fails on privilege, create the bucket manually in the
> Supabase **Storage** UI: name `digital-assets`, **Private**, file size limit 500 MB. Then
> re-run the rest of 039 (it's idempotent: `IF NOT EXISTS` / `DO $$ … duplicate_object`).

### Step 2: Deploy Edge Functions

Three **new** + four **changed** functions. `checkout-webhook` MUST stay `--no-verify-jwt`
(Razorpay calls it unauthenticated, HMAC-verified); all others are `verify_jwt = true` (already in
`config.toml`).

```bash
# New
supabase functions deploy admin-asset-upload
supabase functions deploy asset-download-url
supabase functions deploy asset-claim-free
# Changed (product-aware money path + coupons)
supabase functions deploy checkout-create-order
supabase functions deploy checkout-verify
supabase functions deploy coupon-apply
supabase functions deploy checkout-webhook --no-verify-jwt
```

**Verify deploy:** each returns a new version; `asset-download-url` should 401 on a no-JWT curl;
`checkout-webhook` should reject a missing/invalid `x-razorpay-signature`.

### Step 3: Deploy the frontend

Deploy the branch build to the dev preview first (NOT prod). Frontend changes: `/assets`,
`/asset/:slug`, `/checkout/asset/:id`, Dashboard "Library" tab, admin "Digital Assets" pages.

```bash
npm run build
npx wrangler pages deploy dist --project-name eyebucks-dev --commit-dirty=true
```

> Prod deploy (`--project-name eyebucks`) is hard-walled and requires explicit confirmation — do
> NOT promote to prod until Steps 4–5 pass.

### Step 4: Security / RLS review (MANDATORY GATE)

Run `/rls-test` for the new tables and a focused **security-redteam** pass. Confirm:

- [ ] `asset_purchases`: a normal user **cannot** INSERT/UPDATE (no client write policy) — only
      service-role/admin. Try to self-grant as `authenticated`; expect denial.
- [ ] `digital_assets`: anon/user see only `PUBLISHED AND deleted_at IS NULL`; drafts/archived
      hidden. `storage_path` is never returned by the storefront/admin API column lists.
- [ ] `asset-download-url`: returns a link ONLY for an owner (active `asset_purchases`) or admin;
      403 otherwise; the signed URL expires (~5 min) and the bucket has no public read.
- [ ] `admin-asset-upload`: rejects non-admins; the signed upload URL is path-scoped.
- [ ] Money path: tamper a Razorpay order amount → `checkout-verify` rejects (amount
      re-derivation). Coupon path: forged/mismatched `couponUseId` (wrong user or asset) → rejected.
- [ ] `apply_asset_coupon` not callable by anon (REVOKE PUBLIC + GRANT service_role).
- [ ] Razorpay **webhook** must include `productType:'asset'` + `assetId` in order `notes`
      (set by create-order) so the async fallback grants correctly + idempotently.

### Step 5: Configure Razorpay webhook (if not already)

Ensure the Razorpay dashboard webhook points at the deployed `checkout-webhook` and is subscribed
to `payment.captured` + `payment.failed`. (Already configured for courses — assets reuse it.)

## Rollback

Feature is additive; rollback is low-risk.

- **Frontend:** redeploy the previous build / branch alias.
- **Edge Functions:** redeploy the prior versions (or leave — the asset branches are inert without
  asset data and the course path is unchanged).
- **DB (only if necessary):** the new tables/columns are additive. To fully revert:
  ```sql
  -- 040
  DROP FUNCTION IF EXISTS apply_asset_coupon(TEXT, UUID, TEXT);
  ALTER TABLE coupon_uses DROP CONSTRAINT IF EXISTS coupon_uses_asset_unique;
  ALTER TABLE coupon_uses DROP CONSTRAINT IF EXISTS coupon_uses_one_target;
  ALTER TABLE coupon_uses DROP COLUMN IF EXISTS asset_id;
  -- (course_id can stay nullable; re-adding NOT NULL requires no NULLs present)
  -- 039
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_one_product_target;
  ALTER TABLE payments DROP COLUMN IF EXISTS asset_id;
  DROP TABLE IF EXISTS asset_purchases;
  DROP TABLE IF EXISTS digital_assets;
  DROP TYPE IF EXISTS asset_file_type; DROP TYPE IF EXISTS asset_license;
  -- bucket: delete 'digital-assets' in Storage UI if created
  ```
  ⚠️ Only do the destructive DB rollback if no real purchases exist — dropping `digital_assets`
  cascades to `asset_purchases` and nulls/removes related `payments` rows.

## Verification

End-to-end smoke test on the dev preview (logged in as admin, then as a normal user):

1. **Admin upload:** `/admin/digital-assets` → New Asset → fill form, upload a file (≤500 MB),
   set a price, **Publish**. Confirm it appears published.
2. **Browse:** `/assets` shows the asset; filters + search + sort work; `/asset/:slug` renders.
3. **Paid purchase:** as a non-owner, **Buy now** → `/checkout/asset/:id` → Razorpay (test mode)
   → success → redirected to detail → **Download** works (file downloads).
4. **Coupon:** on asset checkout, apply a valid coupon → discount shows → pay discounted amount →
   verify succeeds (no amount-mismatch). Re-applying the same coupon for the same asset → blocked.
5. **Free lead-magnet:** a price-0 asset → **Get it free** → claimed → Download works (no payment).
6. **My Library:** Dashboard → **Library** tab lists owned assets; download from there works.
7. **Entitlement:** a user who does NOT own a paid asset gets 403 from `asset-download-url`
   (cannot download); a copied signed URL stops working after ~5 min.
8. **Webhook idempotency:** (optional) replay a `payment.captured` webhook → no duplicate purchase
   or payment row.
9. **Regression:** a normal **course** purchase still works end-to-end (course path unchanged).

Once all pass on dev and Step 4 is signed off, schedule the prod promotion (explicit, human-gated).

## Related Docs

- ADR-008 — `docs/adr/008-digital-assets-feature.md`
- `docs/api/EDGE_FUNCTIONS.md`, `docs/architecture/SECURITY_MODEL.md`, `docs/architecture/DATABASE_SCHEMA.md` (update post-launch)
