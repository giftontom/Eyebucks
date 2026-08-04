# Known Issues

Last updated: 2026-08-04

---

## Bugs

### 0. ~~Coupon-discounted course purchases fail payment verification~~ — RESOLVED

| | |
|---|---|
| **Severity** | High (live — customer charged, then verification fails, no enrollment) |
| **Status** | **Resolved — August 2026** |
| **Files** | `services/api/checkout.api.ts`, `pages/Checkout.tsx` |

**Root cause:** The course checkout sent `couponUseId` to `createOrder` (so Razorpay charged the discounted amount) but **not** to `verifyPayment`. `checkout-verify` re-derives the expected amount from `couponUseId`; with it missing on the course path, verify compared the discounted paid amount against the full price and rejected the payment. The asset path (`verifyAssetPayment`/`AssetCheckout.tsx`) already threaded it correctly and was unaffected.

**Resolution:** Added optional `couponUseId` to `verifyPayment` and threaded the held state into the verify call in `Checkout.tsx`. Also cleared `couponUseId` on coupon-input edit so a stale discounted order can no longer be created after the UI reverts to full price. Regression tests added to `checkoutApi.test.ts`. A later workstream replaces this mechanism with Razorpay order-notes re-derivation.

---

### 1. ~~Privacy/Terms pages show dynamic "Last Updated" date~~ — RESOLVED

| | |
|---|---|
| **Severity** | Low |
| **Status** | **Resolved — March 2026** |
| **Files** | `pages/Privacy.tsx`, `pages/Terms.tsx` |

**Resolution:** Replaced `new Date().toLocaleDateString(...)` with the hardcoded string `"March 14, 2026"` in both pages. The date will now only change when the document content is actually revised.

---

### 2. ~~`coursesApi.getCourse()` slug detection uses fragile `startsWith('c')` check~~ — RESOLVED

| | |
|---|---|
| **Severity** | Medium |
| **Status** | **Resolved — March 2026** |
| **File** | `services/api/courses.api.ts` |

**Resolution:** Removed the `startsWith('c')` heuristic. The function now uses a UUID regex check only — if the value is a valid UUID it queries by `id`, otherwise it queries by `slug` using `.or(slug.eq.X,id.eq.X)` to handle both formats robustly.

---

### 3. ~~`reviews.api.ts` fetches ALL reviews twice for summary stats~~ — RESOLVED

| | |
|---|---|
| **Severity** | Medium |
| **Status** | **Resolved — March 2026** |
| **File** | `services/api/reviews.api.ts` |

**Resolution:** Created `get_review_summary` Postgres RPC (migration 023) that computes average rating, rating distribution, and total count server-side in a single query. `getCourseReviews` now calls this RPC instead of fetching all rows client-side.

---

## Security

### 4. ~~Dev credentials hardcoded in production bundle~~ — RESOLVED

| | |
|---|---|
| **Severity** | Medium |
| **Status** | **Resolved — March 2026** |
| **File** | `context/AuthContext.tsx` |

**Resolution:** `loginDev()` is now wrapped in `import.meta.env.DEV` guard. Vite tree-shakes the entire function (including hardcoded credentials) from production builds. The dev login button in the UI is also conditionally rendered behind the same guard.

---

### 5. ~~No RLS preventing admin role self-promotion~~ — RESOLVED

| | |
|---|---|
| **Severity** | Low |
| **Status** | **Resolved — March 2026** |
| **File** | `supabase/migrations/022_protect_role_column.sql` |

**Resolution:** Added `prevent_role_change` BEFORE UPDATE trigger on the `users` table (migration 022). The trigger raises an exception if a non-admin user attempts to change their own `role` column, blocking self-promotion regardless of RLS policy.

---

### 6. ~~Filter injection in `admin.api.ts` `.or()` string interpolation~~ — RESOLVED

| | |
|---|---|
| **Severity** | Low |
| **Status** | **Resolved — March 2026** |
| **File** | `services/api/admin.api.ts` |

**Resolution:** Added `escapeOrFilter()` helper function to `admin.api.ts`. All `.or()` string interpolations now pass user input through this sanitizer before building the filter string, stripping PostgREST special characters.

---

### 6c. ~~Unprotected SECURITY DEFINER RPCs — coupon abuse + bundle/order tampering~~ — RESOLVED

| | |
|---|---|
| **Severity** | High |
| **Status** | **Resolved — August 2026 (migration 042)** |
| **Files** | `supabase/migrations/042_security_hardening.sql` |

**Root cause (verified against the live DB 2026-08-04 via `has_function_privilege`):**
- `apply_coupon` (018) and `apply_asset_coupon` (040) were `EXECUTE`-able by `anon` **and** `authenticated` directly (040's `REVOKE FROM PUBLIC` did not remove a surviving direct grant). Both are `SECURITY DEFINER` and take a caller-supplied `p_user_id`, so any user could redeem/burn coupon uses on any account, bypassing the `coupon-apply` Edge Function.
- `set_bundle_courses` and `reorder_modules` (014) + `reorder_lessons` (034) were `SECURITY DEFINER` with **no `is_admin()` gate in the body** — any authenticated user could rewrite bundle contents or reorder any course's modules/lessons.
- The `"Users read active coupons"` policy (017) let any authenticated user `SELECT *` from `coupons` — full coupon-code enumeration.

**Resolution (migration 042):** Locked `apply_coupon`/`apply_asset_coupon` to `service_role` only + pinned `search_path`; dropped the coupon-enumeration policy (the admin `is_admin()` policy is retained); added an explicit `IF NOT is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'` gate to `set_bundle_courses`, `reorder_modules`, and `reorder_lessons` (DROP-before-replace, `search_path` pinned, PUBLIC/anon revoked, `authenticated`+`service_role` granted). Red-team reviewed SAFE TO APPLY; verified no legitimate caller (admin frontend, coupon Edge Function) breaks.

---

### 6b. ~~Video player broken on dev domain — four compounding issues~~ — RESOLVED

| | |
|---|---|
| **Severity** | Critical |
| **Status** | **Resolved — March 26, 2026** |
| **Files** | `hooks/useVideoUrl.ts`, `components/VideoPlayer.tsx`, `hooks/useVideoPlayer.ts`, `supabase/functions/video-signed-url/index.ts`, `public/_headers` |

**Root causes and resolutions:**

**1. Phase 1 CDN URL caused spurious HLS errors**
`useVideoUrl` previously served the unsigned CDN URL immediately (Phase 1) while fetching the signed URL in the background. When Bunny token authentication is enabled, unsigned URLs return 403, which made HLS.js immediately fire a fatal network error before the signed URL arrived.
*Fix:* Removed Phase 1 CDN URL pre-serve. The hook now only sets the URL state once the signed URL is obtained. CDN URL is kept as a fallback variable only.

**2. Bunny token signing covered only the manifest, not sub-requests**
The original signed URL was scoped to `/videoId/playlist.m3u8`. HLS.js also fetches sub-manifests (e.g., `/videoId/360p/video.m3u8`) and `.ts` segment files, which were not covered by the token and returned 403.
*Fix:* Switched from query-parameter token format to **path-based token format** (`bcdn_token=X` embedded in the URL path). Bunny resolves all HLS.js sub-requests relative to the same base path, so the token propagates automatically to every segment and sub-manifest.

**3. Incorrect Bunny SHA256 hash input**
Bunny Advanced Token Authentication requires: `SHA256(tokenKey + tokenPath + expires + sortedParams)` where `sortedParams = "token_path=/{videoId}/"` (not URL-encoded, appended after expires). The original implementation was missing `sortedParams` from the hash input, producing tokens that Bunny rejected.
*Fix:* Updated `video-signed-url/index.ts` to use the correct hash format per Bunny documentation.

**4. CSP blocked HLS.js `blob:` URLs**
HLS.js uses the MediaSource API to feed decoded TS segments into `<video>` via `blob:` URLs. The Content Security Policy lacked an explicit `media-src` directive, so the browser fell back to `default-src 'self'` which blocks `blob:`. This caused the "Video format not supported" (MediaError code 4) error.
*Fix:* Added `media-src 'self' blob: https://*.b-cdn.net; worker-src blob:;` to `public/_headers`.

**5. Error overlay persisted after HLS recovery**
`videoError` state was set when the initial 403 error fired and was never cleared even after HLS.js successfully loaded the signed URL. The error overlay remained visible despite successful playback.
*Fix:* `handleLevelsLoaded` in `hooks/useVideoPlayer.ts` now calls `setVideoError(null)` when HLS.js fires `MANIFEST_PARSED` (confirming successful load).

**6. `hlsErrorFiredRef` race condition in VideoPlayer**
`hlsErrorFiredRef.current` was set to `true` after the `switch` statement, but `hls.recoverMediaError()` internally calls `video.load()` which triggers the native `<video> onError` event synchronously — before the flag was set. This caused the native error handler to fire and display a second error message.
*Fix:* Moved `hlsErrorFiredRef.current = true` to the very top of the `data.fatal` block, before any recovery attempt.

---

## Technical Debt

### 7. `types/supabase.ts` includes stale `sessions`/`refresh_tokens` tables (open)

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **File** | `types/supabase.ts` |

**Description:**
`types/supabase.ts` includes type definitions for `sessions` and `refresh_tokens` tables that were dropped during the migration to Supabase Auth. Migrations 022 and 023 have been applied (protect_role_column, get_review_summary_rpc), so the generated types are also out of date for those additions. The file needs full regeneration.

**Blocker:** Docker is required to run `supabase gen types typescript --local`. Regenerate when Docker is available: run `/gen-db-types`.

---

### 8. No server state caching — TanStack Query not started (open)

| | |
|---|---|
| **Severity** | Medium |
| **Priority** | Medium |
| **Files** | All page components (`pages/Dashboard.tsx`, `pages/Learn.tsx`, `pages/Profile.tsx`, `pages/Storefront.tsx`, etc.) |

**Description:**
Every page that fetches data uses raw `useEffect` + `useState` patterns with no caching, deduplication, or background refetch. Navigating away and returning triggers a full re-fetch every time. No stale-while-revalidate behavior means all page transitions show loading spinners.

**Suggested fix:**
Adopt TanStack Query (React Query). Migrate incrementally, starting with the most frequently accessed queries (courses, enrollments, user profile).

---

### 9. ~~No error boundaries around admin pages~~ — RESOLVED

| | |
|---|---|
| **Severity** | Low |
| **Status** | **Resolved — March 2026** |
| **File** | `pages/admin/AdminLayout.tsx` |

**Resolution:** `AdminErrorFallback` component added directly to `AdminLayout.tsx`. The outlet is now wrapped in an `ErrorBoundary` that shows a branded error UI with a "Return to Admin Dashboard" link, allowing recovery without a full page reload.

---

### ~~10. Admin page unit test coverage gap~~ — RESOLVED

| | |
|---|---|
| **Severity** | Medium |
| **Status** | **Resolved — March 2026** |
| **Files** | `pages/admin/` (12 pages: Dashboard, Courses, CourseEditor, Users, UserDetail, Payments, Certificates, Content, Coupons, Reviews, AuditLog, Settings) |

**Resolution:** All 12 admin pages now have unit tests under `src/__tests__/pages/admin/`. Each test file covers render, happy-path interactions, and error states. Total test suite is 450+ tests, all passing.

---

### 11. ~~HashRouter prevents SEO indexing of public pages~~ — RESOLVED (June 2026)

| | |
|---|---|
| **Severity** | ~~Low~~ Resolved |
| **Priority** | ~~Low~~ Done |
| **File** | `App.tsx`, `public/_redirects` |

**Description:**
The app previously used `HashRouter` (URLs like `/#/course/x`), whose hash-based URLs are not crawled by search engine bots, so the Storefront, CourseDetails, and other public pages could not be indexed.

**Resolution:**
Migrated to `BrowserRouter` (clean URLs like `/course/x`). The SPA deep-link fallback is configured in `public/_redirects` (`/* /index.html 200`), so direct hits and refreshes on any route resolve correctly on Cloudflare Pages. Public pages are now crawlable. See ADR-006 (supersedes ADR-002).

---

---

### ~~12. CMS section coverage gaps — hardcoded landing copy, missing creators/instructors/value_cards, no image upload~~ — RESOLVED (June 21, 2026)

| | |
|---|---|
| **Severity** | Medium |
| **Status** | **Resolved — June 21, 2026** |
| **Files** | `supabase/migrations/033_cms_section_keys.sql`, `supabase/functions/admin-image-upload/index.ts`, `services/api/siteImages.api.ts`, `components/ImageUpload.tsx`, `pages/admin/content/sectionSchemas.ts`, `pages/admin/ContentPage.tsx` |

**Resolution:** Migration 033 widened the `site_content.section` CHECK constraint to 18 keys (faq, testimonial, showcase, banner, settings, creators, instructors, value_cards, hero, social_proof, featured_copy, how_it_works, value_props_copy, instructors_copy, community_copy, creators_copy, pricing_copy, closing). All 10 landing section components now read copy from the CMS via `siteContentApi.getBySection()` with hardcoded fallbacks. The `admin-image-upload` Edge Function (Bunny Storage proxy) + `siteImages.api.ts` + `ImageUpload` component enable image fields in the CMS editor. `pages/admin/content/sectionSchemas.ts` (`SECTION_SCHEMAS`) is the single source of truth for admin sub-form shapes.

---

### 13. Digital Assets feature built but not yet deployed (open)

| | |
|---|---|
| **Severity** | Blocker for launch of the digital assets product line |
| **Priority** | High |
| **Status** | Open — files exist on branch `ui-ux-phase-0-2`; migrations 039/040 NOT applied; edge functions NOT deployed |

**Description:**
Phases 1–4 of the Digital Assets feature (foundation, admin pages, storefront + checkout, and coupons-on-assets) are fully built and test-locked (751/751 tests green). However, the feature is gated behind the deployment runbook and a security review before any migration is applied to the shared dev/prod Supabase database.

**What is built (files only):**
- Migrations 039 (`digital_assets`, `asset_purchases`, ENUMs, RLS, private Storage bucket, `payments.asset_id`) and 040 (`coupon_uses.asset_id`, `apply_asset_coupon` RPC).
- 3 new Edge Functions: `admin-asset-upload`, `asset-download-url`, `asset-claim-free`.
- 4 product-aware updated Edge Functions: `checkout-create-order`, `checkout-verify`, `checkout-webhook`, `coupon-apply`.
- `services/api/digitalAssets.api.ts` + new methods on `checkout.api.ts` and `coupons.api.ts`.
- Admin pages: `DigitalAssetsPage`, `DigitalAssetEditorPage`.
- Public pages: `Assets` (`/assets`), `AssetDetails` (`/asset/:slug`), `AssetCheckout` (`/checkout/asset/:id`).
- Components: `AssetCard`, `AssetUploader`, `OwnedAssetsTab`, `AssetsCatalogSection`, `AssetsShowcaseSection`.
- Dashboard "Library" tab (`OwnedAssetsTab`).
- `assetDeliveryEmail` template in `_shared/emailTemplates.ts`.

**Go-live gate:**
Follow `docs/operations/DIGITAL_ASSETS_GO_LIVE.md` — apply migrations 039+040, create the `digital-assets` Storage bucket, deploy 7 edge functions (webhook stays `--no-verify-jwt`), run `/rls-test digital_assets` and `/rls-test asset_purchases`, complete security-redteam review of entitlement + download paths.

**Deferred scope (not built):**
- Asset bundles / packs
- Course-checkout upsells ("also add this asset")
- Included-with-course bonuses

---

## Resolved Issues

Issues below were resolved during the codebase standardization refactor (March 2026).

### R1. `BundleCoursePicker` used `(c as any)` type assertions

**Resolution:** The `AdminCourse` type now includes `deletedAt` and `_count` fields, eliminating the need for `any` casts.

---

### R2. `Dashboard.tsx` bypassed API layer with direct Supabase queries

**Resolution:** A new `coursesApi.getCoursesByIds()` method was added. Dashboard now imports from `services/api` instead of querying Supabase directly.

---

### R3. Duplicate refund logic between `admin.api.ts` and `payments.api.ts`

**Resolution:** `adminApi.processRefund` now delegates to `paymentsApi.processRefund()` instead of calling the Edge Function directly.

---

### R4. Duplicate user-mapping logic in `AuthContext` and `users.api.ts`

**Resolution:** A shared `mapUserProfile` function is now exported from `users.api.ts` and used by both `AuthContext` and `usersApi`.

---

### R5. Notification mapping duplicated in `useRealtimeNotifications` and `notifications.api.ts`

**Resolution:** `mapNotification` is now exported from `notifications.api.ts` and imported by the `useRealtimeNotifications` hook.

---

### R6. `dataExport.ts` references removed localStorage keys (dead code)

**Resolution:** The file `utils/dataExport.ts` was deleted entirely.

---

### R7. Heavy `any` usage in `admin.api.ts`

**Resolution:** 30+ `any` types replaced with proper typed interfaces (`AdminCourse`, `AdminUser`, `AdminPayment`, etc.) throughout the module.

---

### R8. `helpful` vs `helpful_count` field naming mismatch in reviews

**Resolution:** The select query in `reviews.api.ts` was fixed to use `helpful_count`. The mapper converts the DB column `helpful_count` to the frontend field `helpful` for consistency.

---

### R9. SOW gap — Video trailer on CourseDetails not implemented

**Resolution:** Already built. `pages/CourseDetails.tsx:144-176` renders a `VideoPlayer`
for `course.heroVideoId` as the course trailer. No code change needed.

---

### R10. SOW gap — Sticky Buy button missing on mobile

**Resolution:** Already built. `pages/CourseDetails.tsx:425-454` uses an `IntersectionObserver`
on the inline CTA to show a sticky bottom bar on mobile when the CTA scrolls out of view.
No code change needed.

---

### R11. SOW gap — Right-click disabled on video player

**Resolution:** Already built. `pages/Learn.tsx:315` adds `onContextMenu={e => e.preventDefault()}`
to the video wrapper element. No code change needed.

---

### R12. SOW gap — Hard session limit (sign out other sessions on login)

**Resolution:** Already built. `supabase/functions/session-enforce/index.ts` calls
`supabase.auth.admin.signOut(userId, 'others')` on every login, ensuring only one active
session per user. No code change needed.
