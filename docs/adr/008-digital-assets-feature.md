# ADR-008: Digital Assets (downloadable products) feature

> **Status:** Accepted
> **Date:** 2026-06-22 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

Eyebuckz currently sells a single product type: **courses** (one-time INR purchase, video
delivered via Bunny Stream, access gated by `enrollments`). For a filmmaking/creator academy,
there is a natural second product line that the platform does not yet support: **digital
assets** — downloadable files such as LUTs, editing presets, SFX/music packs, overlays,
project files, templates, and PDF guides.

Digital assets are attractive because they are **high-margin** (upload once, sell unlimited
times), they **reinforce the brand** (the same audience that buys courses wants the tools),
and they create **funnel and upsell opportunities** (free lead-magnets, course add-ons).

The question this ADR answers: **how should digital assets be implemented** so they ship as a
real, lasting product line without destabilising the existing — and security-sensitive —
course/payment system?

Constraints and relevant facts at decision time:

- Payment rail is Razorpay via Edge Functions (`checkout-create-order`, `checkout-verify`,
  `checkout-webhook`); the money path has already been hardened and red-teamed (migrations
  030/031, amount re-derivation, HMAC verification).
- File hosting is Bunny.net — Bunny **Stream** for video, Bunny **Storage** (Pull Zone CDN)
  for CMS images. Image uploads currently return **public** CDN URLs.
- Access/entitlement for courses is the `enrollments` table + `useAccessControl` hook + RLS.
- Dev and prod currently share **one** Supabase database (pre-launch); schema changes must be
  treated carefully. Next migration number is **039**.
- The product is pre-launch with only test users.

## Decision Drivers

- **Don't fork the money path.** The payment code is the most sensitive surface; a second
  independent checkout would double the attack/maintenance surface.
- **Keep assets structurally independent of courses.** Assets have no modules/lessons/
  progress/certificates/ratings; overloading the `courses` table would create NULL-column
  sprawl and risk course code paths mis-handling an asset.
- **Paid files must not leak.** A purchased download link must be entitlement-checked and
  short-lived; a copied link must not grant free, permanent access.
- **Support large files** (project files up to ~500 MB) without hitting request-body limits.
- **Scale to a real catalogue** with its own shop, filters, pricing, coupons, and bundles.

## Options Considered

### Option A: External store (Razorpay Payment Links / Gumroad-style)
- Pro: Days to launch; validates demand with almost no build.
- Con: Off-site experience, separate logins, no unified "My Library" or reporting, external
  fees. Not a long-term home.

### Option B: Bolt onto the existing `courses` table (new `type='ASSET'`)
- Pro: Fastest native option; reuses everything.
- Con: Pollutes courses with NULL columns; breaks `CourseWithModules` assumptions; risks
  RLS/progress/certificate code treating an asset as a course. Gets messy as the line grows.

### Option C: Native shop — separate tables + one product-aware checkout *(chosen)*
- Pro: Clean data separation (`digital_assets` + `asset_purchases`) **and** a single,
  battle-tested payment path (checkout functions branch on a `productType` discriminator).
  Full control: own shop pages, "My Library", secure expiring downloads, coupons, bundles.
- Con: More work than A/B (but far less than D); requires careful, gated changes to the
  shared payment functions.

### Option D: Fully standalone shop (separate tables **and** separate payment path)
- Pro: Maximum isolation.
- Con: Duplicates the sensitive payment code — two systems to secure, test, maintain. No
  benefit over C at this scale.

## Decision

**We chose Option C — a native shop with separate product/entitlement tables and a single,
product-aware checkout.**

Rationale, mapped to the drivers:

- **Separate tables** (`digital_assets`, `asset_purchases`) satisfy "keep assets independent
  of courses" without NULL-column sprawl.
- **Product-aware checkout** (a `productType: 'course' | 'asset'` discriminator threaded
  through the existing `checkout-create-order` / `checkout-verify` / `checkout-webhook` and
  stored in Razorpay `notes`) satisfies "don't fork the money path."
- **Private Supabase Storage bucket (`digital-assets`) + an entitlement-gated
  `asset-download-url` Edge Function** that issues a short-lived (~5 min) `createSignedUrl`
  satisfies "paid files must not leak." A private bucket has no public read; the only way to a
  file is a signed URL minted by the service-role function *after* the entitlement check.
- **Signed upload URLs** (`admin-asset-upload` returns `createSignedUploadUrl`; the admin
  browser then `uploadToSignedUrl` directly) satisfy "support large files" (≤500 MB) WITHOUT
  exposing any storage key to the client and without the Edge-Function request-body limit.

  *Storage-backend refinement:* the original sketch proposed a private **Bunny** zone (to match
  video/images). On implementation we chose **Supabase Storage** for asset files instead: Bunny
  Storage has no TUS/pre-signed-PUT, so secure large *uploads* would require either proxying
  through the Edge Function (body-size limited) or shipping the write key to the browser (unsafe).
  Supabase Storage gives both signed upload **and** signed download natively, with no new
  provider/secrets. Bunny remains the backend for Stream video and CMS images.

**Locked product decisions** (made with the owner):

| Decision | Choice |
|---|---|
| File size | Built for large files (~500 MB) — TUS uploader |
| Launch monetization | Sell individually + coupons (reuse existing) + one free lead-magnet |
| Storefront placement | Dedicated `/assets` shop page **+** homepage showcase section |

Monetization layers deferred to a later phase: asset bundles/packs, course-checkout upsells,
included-with-course bonuses, and an all-access membership.

### Implementation outline (phased)

1. **Foundation** — migration `039_digital_assets.sql` (`digital_assets`, `asset_purchases`,
   `asset_file_type` + `asset_license` ENUMs, RLS, `payments.asset_id`); `types/index.ts`;
   `services/api/digitalAssets.api.ts`; Edge Functions `admin-asset-upload` +
   `asset-download-url`. **Files created locally; not applied to the DB or deployed without a
   separate explicit go-ahead.** Gated by a security-redteam review + `/rls-test`.
2. **Admin** — `DigitalAssetsPage` + `DigitalAssetEditorPage` (clone of the Courses admin),
   routes, sidebar entry, audit logging.
3. **Storefront + checkout** — `/assets` catalog, `/asset/:slug` detail, `AssetCard`,
   product-aware checkout, "My Library" tab, Resend delivery email, homepage showcase
   (CMS-driven copy via `sectionSchemas.ts`).
4. **Monetization extras** — bundles, checkout upsells, included-with-course bonuses.

## Consequences

### Positive
- A new high-margin revenue stream that reuses proven auth, payment, storage, and admin.
- Course code is untouched and uncontaminated; assets evolve independently.
- One secured money path; one secured download-entitlement path.
- Reuses the existing coupon system with no extra build.

### Negative / Trade-offs
- The shared checkout Edge Functions gain a `productType` branch — added complexity on the
  most sensitive code. Mitigation: keep the HMAC/signature/amount-re-derivation logic single
  and shared; branch only at entitlement creation; mandatory red-team + RLS test before
  integration.
- A new private Supabase Storage bucket (`digital-assets`) is introduced (created by migration
  039). Minimal new config — no new third-party provider or secrets. Mitigation: bucket is
  created idempotently in the migration and documented in the deployment guide.

### Risks
- **Download-link leakage** if entitlement check or TTL is wrong. Mitigation: server-only
  `storage_path` (never selected by the storefront API), entitlement check in the Edge
  Function, short TTL, private zone.
- **Free self-grant** of `asset_purchases`. Mitigation: no client INSERT/UPDATE RLS on
  `asset_purchases`; only the service-role checkout function writes.
- **Shared dev/prod DB** means migration 039 affects both. Mitigation: pre-launch, test users
  only; apply only on explicit go-ahead following the project's deploy guard.

## Links

- `docs/architecture/SECURITY_MODEL.md` — URL signing + payment security model (pattern reused)
- `docs/api/EDGE_FUNCTIONS.md` — checkout + signed-URL functions (to be extended)
- `docs/architecture/DATABASE_SCHEMA.md` — schema conventions (tables/ENUMs/RLS)
- ADR-003 (Razorpay), ADR-004 (Bunny.net) — the rails this feature reuses
- `docs/project/KNOWN_ISSUES.md` — track follow-ups (TanStack Query, types regen)
