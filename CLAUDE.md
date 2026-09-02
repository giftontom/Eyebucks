# Eyebuckz LMS - Project Context

## PRODUCTION DEPLOY GUARD — NON-NEGOTIABLE

**Claude MUST NEVER deploy to the production Cloudflare Pages project (`--project-name eyebucks`) without an explicit, unambiguous instruction from the user in the same conversation turn.**

### What counts as explicit confirmation
- "deploy to production", "deploy to prod", "go live", "ship to eyebuckz.com", "confirmed deploy to prod"

### What does NOT count
- Any inference from context ("the last deployment was prod, so this must be too")
- A prior approval in an earlier turn
- Deploying as part of a larger task unless the user explicitly included "to prod" in that request
- Casual phrasing: "deploy it", "push it", "deploy the site" — **always ask prod vs dev first**

### Enforcement
- The `PreToolUse` hook in `.claude/settings.json` blocks `wrangler pages deploy ... eyebucks` (non-dev) unless `CONFIRMED_PROD_DEPLOY=true` is prepended — this acts as a hard wall at the shell level
- If blocked, Claude must stop and ask the user for explicit confirmation before retrying

---

## Skill Auto-Invocation Rules

### PRIMARY RULE — Applies Every Session

Before writing any code, editing any file, or running any shell command manually, Claude MUST:
1. Check whether the user's request maps to a skill in `.claude/skills/`
2. If a match exists: invoke it immediately using the `Skill` tool
3. Announce: "Invoking /skill-name..." before calling the tool
4. Pass arguments inferred from the user's phrasing — do NOT ask them to rephrase into slash-command syntax

**This applies even when:**
- The user uses completely different wording than the skill name
- The request is phrased as a question ("can you make a login page?")
- The request is casual ("something's slow", "can you deploy?")
- The user says "just" or "quickly" ("just run the tests")
- Claude could accomplish the task manually without the skill

**Do NOT skip a skill because:**
- Writing code manually seems faster
- You are unsure of exact arguments — infer from context, or ask one question, then invoke
- The user didn't type `/skill-name`

### HOW TO INVOKE

Use the `Skill` tool directly:
- `Skill(skill: "pre-commit")` — no args needed
- `Skill(skill: "new-page", args: "Login --public --path /login")` — args inferred from phrasing
- `Skill(skill: "design-component", args: "Button A primary action button with loading state")`

**Argument inference:**
- Name args: extract noun from user's request ("make a CourseCard" → `CourseCard`)
- Description args: paraphrase the user's intent in one sentence
- Flags: infer from context (`--admin` if admin context, `--dev` if "staging" or "dev")
- Optional args: omit rather than guess; ask one question if critical

### COMPOUND REQUESTS
When intent maps to multiple skills ("build a quiz feature and deploy it"), invoke sequentially in dependency order. Never batch-invoke in parallel.

### FALLBACK
If no skill matches after checking the **Auto-Skill Triggers** table below (the canonical trigger source — see `SKILLS_STANDARDS.md` §6), proceed with manual implementation. Do not force an irrelevant skill.

### AMBIGUITY
If phrasing could match 2+ skills (e.g., "test this" → `run-tests` vs `e2e-test`), pick the most specific match. If genuinely ambiguous, ask one question, then invoke.

---

## Stack

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4 + React Router 7 (BrowserRouter)
- **Backend:** Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions)
- **Payments:** Razorpay (Edge Functions handle secrets)
- **Video:** Bunny.net Stream (HLS, signed URLs via Edge Function)
- **Email:** Resend (via Edge Function)
- **Deploy:** Cloudflare Pages (frontend) + Supabase (backend)
- **Analytics:** PostHog (via `utils/analytics.ts` wrapper)
- **Error Tracking:** Sentry (via ErrorBoundary)

---

## Key Patterns

- **Auth:** Supabase Auth with Google OAuth. `context/AuthContext.tsx` manages session state. Auth trigger auto-creates user profile on signup.
- **Data access:** All queries go through `services/api/*.api.ts` modules using `@supabase/supabase-js`. Security is enforced by RLS policies at the database level, not in frontend code.
- **Edge Functions:** Deno runtime in `supabase/functions/`. Used for server-side secrets (Razorpay, Bunny.net, Resend). Most require JWT auth; `checkout-webhook` does not (Razorpay calls it). Shared utilities in `supabase/functions/_shared/`.
- **CMS reads:** `context/SiteContentContext.tsx` loads every `site_content` row in ONE request and hydrates synchronously from a localStorage copy, so a returning visitor's first paint already has real copy. Sections call `useSiteSection(key)`; do NOT reintroduce per-section `siteContentApi.getBySection` in components.
- **Types:** `types/index.ts` (business types), `types/api.ts` (request/response), `types/supabase.ts` (auto-generated DB types).
- **Admin pages:** Split into sub-pages under `pages/admin/` with shared `AdminContext` and `AdminLayout`.

### Auth Flow (detailed)
1. Google OAuth → Supabase Auth
2. `handle_new_user` DB trigger → creates `public.users` row (`role='USER'`)
3. AuthContext mounts → `getSession()` → loads user profile from `public.users`
4. On SIGNED_IN: calls `session-enforce` Edge Function (3s timeout, lenient on network error)
5. Retries profile load with exponential backoff: 200ms → 400ms → 800ms → 1.6s → 3s

### Video Pipeline (detailed)
1. `useVideoUrl(videoId, moduleId, fallbackUrl)` calls `video-signed-url` Edge Function immediately (does NOT pre-serve unsigned CDN URL — Bunny token auth is enabled, unsigned URLs return 403)
2. Edge Function generates SHA256 path-based Bunny token: `SHA256(key + "/{videoId}/" + expires + "token_path=/{videoId}/")`; token embedded in URL path so HLS.js sub-requests (sub-manifests, segments) inherit auth automatically
3. On success: sets signed URL, schedules auto-refresh 5min before 1hr expiry
4. On fail: falls back to CDN URL (silent if CDN URL works; shows error only if both fail)
5. `VideoPlayer.tsx`: HLS.js adaptive streaming, quality switching, PiP, in-place URL refresh preserving playback position, retry on error (3 attempts); `hlsErrorFiredRef` prevents double error on HLS recovery
6. `useVideoPlayer.ts`: clears error overlay when `onLevelsLoaded` fires (HLS success after prior error)
7. CSP: `public/_headers` must include `media-src 'self' blob: https://*.b-cdn.net; worker-src blob:;` for HLS.js MediaSource API

### Payment Flow (detailed)
1. `checkout.api.ts` `createOrder()` → `checkout-create-order` Edge Function → Razorpay order ID
2. Frontend: Razorpay checkout modal (loaded via `useScript` hook, deduplication guard)
3. On success: `verifyPayment()` → `checkout-verify` Edge Function (HMAC signature check)
4. Edge Function: creates enrollment + payment record + sends email via Resend
5. Async fallback: Razorpay calls `checkout-webhook` (no JWT, HMAC-verified) as safety net

### Progress & Completion (detailed)
1. `useModuleProgress` auto-saves every 30s while playing (`AUTO_SAVE_INTERVAL = 30000`)
2. First save of a session increments `view_count` via `increment_view_count` RPC
3. At 95% watch time (`COMPLETION_THRESHOLD = 0.95`): calls `progress-complete` Edge Function
4. Edge Function calls `complete_module()` RPC (atomic) → marks module complete
5. If entire course complete: triggers `certificate-generate` → creates certificate + sends email
6. Milestones at 25/50/75% course completion → `milestone` notifications

---

## Database Schema

### 21 Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles synced from auth.users via trigger; has `role` ENUM, `phone_e164`, `google_id`, `preferred_language` (storefront language pref) |
| `courses` | Course catalog; `slug` UNIQUE; `price` in paise; `language` (`course_language` ENUM, EN/ML) + optional `course_group_id` link siblings; soft-delete via `deleted_at` |
| `modules` | Course chapters; `video_id` is Bunny GUID; `order_index`; `is_free_preview` |
| `enrollments` | User-course access; `status` ENUM; `expires_at` for time-limited access |
| `progress` | Per-module watch progress; `timestamp`, `completed`, `watch_time`, `view_count` |
| `payments` | Razorpay transaction records; `razorpay_order_id`, `razorpay_payment_id`; `course_id` nullable (XOR with `asset_id`) |
| `certificates` | Course completion certificates; `certificate_number`, `download_url`, `pdf_data` |
| `reviews` | Course ratings + comments; `helpful` upvote count |
| `notifications` | User notification inbox; `type` ENUM, `link`, `read` boolean |
| `site_content` | CMS blocks; `section` CHECK: 22 keys — faq, testimonial, showcase, banner, settings, creators, instructors, value_cards, hero, hero_slides, social_proof, featured_copy, how_it_works, how_it_works_steps, value_props_copy, instructors_copy, community_copy, creators_copy, pricing_copy, closing, footer_links, course_includes |
| `bundle_courses` | Junction: BUNDLE-type courses → individual courses; `order_index` |
| `bundle_assets` | Junction: BUNDLE-type courses → digital assets; `order_index` (migration 043) |
| `upgrade_pricing_config` | Single-row runtime knobs for module→bundle upgrade pricing: `enabled`, `credit_pct`, `window_days`, `cross_sell_pct` (migration 044) |
| `upgrade_credits_applied` | Ledger of consumed upgrade credits; `UNIQUE(user_id, source_payment_id)`; service-role writes only (migration 044) |
| `coupon_uses` | Atomic coupon redemption records; `discount_pct` captured at use time; `course_id` nullable (XOR with `asset_id`) |
| `coupons` | Discount codes; `discount_pct`, `max_uses`, `use_count`, `expires_at`, `is_active` |
| `wishlists` | User favorites; UNIQUE constraint on `(user_id, course_id)` |
| `login_attempts` | Auth audit trail; `ip_address`, `user_agent`, `success`, `fail_reason` |
| `audit_logs` | Admin action log; `action`, `entity_type`, `entity_id`, `old_value`, `new_value` |
| `digital_assets` | Downloadable product catalog; `slug`, `price` (paise), `file_type` ENUM, `license` ENUM, `storage_path` (private — server-only), `status` reuses `course_status`; soft-delete via `deleted_at` |
| `asset_purchases` | Digital asset entitlement; `user_id`, `asset_id`, `status` reuses `enrollment_status`; UNIQUE `(user_id, asset_id)`; no client INSERT/UPDATE — service-role only |

### 9 ENUMs
- `user_role`: `USER` | `ADMIN`
- `course_type`: `BUNDLE` | `MODULE`
- `course_language`: `EN` | `ML` (content language of a course; drives storefront language filtering — migration 041)
- `course_status`: `PUBLISHED` | `DRAFT`
- `enrollment_status`: `ACTIVE` | `EXPIRED` | `REVOKED` | `PENDING`
- `certificate_status`: `ACTIVE` | `REVOKED`
- `notification_type`: `enrollment` | `milestone` | `certificate` | `announcement` | `review`
- `asset_file_type`: `LUT` | `PRESET` | `SFX` | `MUSIC` | `OVERLAY` | `PROJECT` | `PDF` | `TEMPLATE` | `OTHER`
- `asset_license`: `PERSONAL` | `COMMERCIAL` | `EXTENDED`

### 19 RPC Functions
| RPC | Purpose |
|-----|---------|
| `apply_coupon(code, course_id, user_id)` | Atomic coupon validation + redemption → coupon_use_id, discount_pct |
| `apply_asset_coupon(p_code, p_user_id, p_asset_id)` | Atomic coupon validation + redemption for digital assets → coupon_use_id, discount_pct (SECURITY DEFINER; REVOKE PUBLIC) |
| `complete_module(user_id, module_id, course_id)` | Marks module done, checks course completion → JSONB status |
| `expire_enrollments()` | Auto-expire past-due enrollments (run by pg_cron) → INTEGER count |
| `generate_receipt_number()` | Unique receipt string for payments |
| `get_admin_stats()` | KPI dashboard data → JSONB |
| `get_upgrade_quote(p_course_id, p_user_id?)` | Pure-read module→bundle upgrade quote (credit already paid, discounted price) → JSONB; authenticated self-scoped + service_role (migration 044) |
| `apply_upgrade_credit(p_user_id, p_course_id, p_paid_amount, p_order_id)` | Consuming: locks + writes the credit ledger, validates final==paid, atomic; service_role only (migration 044) |
| `get_course_analytics(course_id)` | Per-course stats → JSONB |
| `get_progress_stats(user_id, course_id)` | User's progress for a course → JSONB |
| `get_recent_activity(limit)` | Recent admin activity feed → JSONB |
| `get_sales_data(days)` | Revenue time series → Array {date, amount, count} |
| `increment_view_count(user_id, course_id, module_id, timestamp)` | Increments view_count on first play of session |
| `is_admin()` | BOOLEAN check (SECURITY DEFINER, used in all RLS policies) |
| `reorder_modules(course_id, module_ids[])` | Updates order_index for drag-drop reorder |
| `save_progress_timestamp(user_id, course_id, module_id, timestamp)` | Saves video position (auto-save) |
| `set_bundle_courses(bundle_id, course_ids[])` | Replaces bundle_courses junction rows atomically |

### RLS Patterns
- **User-scoped:** `USING (user_id = auth.uid())`
- **Admin override:** `USING (user_id = auth.uid() OR is_admin())`
- **Public reads:** condition-based (e.g., `status = 'PUBLISHED'` for courses)
- **No user DELETE on enrollments** — prevents self-unenrollment
- **Gap (security):** `users_update_own` policy allows updating the `role` column — user could self-promote to ADMIN

---

## Where to Add New Code

| What | Where | Notes |
|------|-------|-------|
| New API query | `services/api/{domain}.api.ts` | Add to barrel in `services/api/index.ts` |
| New shared component | `components/{Name}.tsx` | PascalCase filename |
| New hook | `hooks/use{Name}.ts` | camelCase with `use` prefix |
| New page | `pages/{Name}.tsx` | Add route in `App.tsx` |
| New admin page | `pages/admin/{Name}Page.tsx` | Add route in `AdminRoutes.tsx` |
| New Edge Function | `supabase/functions/{kebab-name}/index.ts` | Use `_shared/` helpers |
| New admin hook | `pages/admin/hooks/use{Name}.ts` | camelCase with `use` prefix |
| New DB migration | `supabase/migrations/{NNN}_{description}.sql` | **Next number: 052** |
| New business type | `types/index.ts` | |
| New API type | `types/api.ts` | |

---

## Pages Catalog

### Public Pages (`pages/*.tsx`)
| Page | Route | Purpose |
|------|-------|---------|
| `Storefront.tsx` | `/` | Marketing landing: hero carousel, featured courses, pricing, FAQ (section components in `components/sections/`) |
| `Courses.tsx` | `/courses` | Full course catalog (`CatalogSection`) — filters, search, sort |
| `CourseDetails.tsx` | `/course/:id` | Full course info, modules list, reviews, enroll CTA (`pages/course-details/`) |
| `Login.tsx` | `/login` | Google OAuth + dev login button |
| `About.tsx` | `/about` | Company about page |
| `Contact.tsx` | `/contact` | Contact form/info |
| `Privacy.tsx` | `/privacy` | Privacy policy (Last Updated hardcoded to "March 14, 2026") |
| `Terms.tsx` | `/terms` | Terms of service (Last Updated hardcoded to "March 14, 2026") |
| `Checkout.tsx` | `/checkout/:id` | Razorpay modal flow + `pages/checkout/CheckoutSummary` (protected) |
| `AssetCheckout.tsx` | `/checkout/asset/:id` | Digital asset checkout — Razorpay modal or free-claim flow (protected) |
| `Assets.tsx` | `/assets` | Digital assets shop — catalog, filters, search |
| `AssetDetails.tsx` | `/asset/:slug` | Digital asset detail page — preview, pricing, purchase/claim CTA |
| `Dashboard.tsx` | `/dashboard` | "My Studio" — enrolled courses + progress + "Library" tab for owned assets (protected) |
| `Learn.tsx` | `/learn/:id` | HLS video player + module nav + notes (protected) |
| `Profile.tsx` | `/profile` | User profile + certificate list (protected) |
| `Notifications.tsx` | `/notifications` | Notification inbox — "Alerts" tab in mobile nav (protected) |
| `PurchaseSuccess.tsx` | `/success` | Post-payment confirmation (protected) |

### Admin Pages (`pages/admin/*.tsx`)
| Page | Route | Purpose |
|------|-------|---------|
| `DashboardPage.tsx` | `/admin` | KPIs, sales chart (Recharts), recent activity |
| `CoursesPage.tsx` | `/admin/courses` | Course list, publish/draft toggle, soft-delete |
| `CourseEditorPage.tsx` | `/admin/courses/:id` | Module CRUD, video upload (TUS), bundle config |
| `UsersPage.tsx` | `/admin/users` | User list with search/pagination |
| `UserDetailPage.tsx` | `/admin/users/:id` | User profile, enrollments, manual enroll |
| `PaymentsPage.tsx` | `/admin/payments` | Payment history, refund processing |
| `CertificatesPage.tsx` | `/admin/certificates` | Issue/revoke certificates |
| `ContentPage.tsx` | `/admin/content` | CMS editor — typed per-section sub-forms, image upload, JSON escape hatch; covers all 20 CMS section keys, each labelled with where it renders on the site |
| `CouponsPage.tsx` | `/admin/coupons` | Create/deactivate coupon codes |
| `ReviewsPage.tsx` | `/admin/reviews` | Moderate + delete course reviews |
| `AuditLogPage.tsx` | `/admin/audit` | Admin action log (created_at, action, entity, diff) |
| `SettingsPage.tsx` | `/admin/settings` | Site-wide settings (maintenance mode, featured course, etc.) |
| `DigitalAssetsPage.tsx` | `/admin/digital-assets` | Digital asset list — publish/draft toggle, soft-delete |
| `DigitalAssetEditorPage.tsx` | `/admin/digital-assets/new` and `/:assetId` | Create/edit digital asset — metadata, file upload via `AssetUploader` |

**Routing:** BrowserRouter (SPA fallback via `public/_redirects` → `index.html`), `React.lazy()` for all protected/admin routes, `Suspense` with `PageLoader` fallback.

---

## Components Catalog

### Design System (primitives in `components/`)
| Component | Key Props | Purpose |
|-----------|-----------|---------|
| `Badge` | `variant(success\|warning\|danger\|info\|brand\|default\|outline)`, `size(sm\|md)`, `dot` | Status/category pill |
| `Button` | `variant(primary\|secondary\|ghost\|danger\|outline)`, `size(sm\|md\|lg\|icon)`, `loading`, `leftIcon`, `rightIcon`, `fullWidth` | Accessible button with loading + icons |
| `Card` | `variant(default\|glass)`, `radius(lg\|xl\|2xl\|3xl)`, `padding(none\|sm\|md\|lg)`, `header`, `footer` | Surface container |
| `Input` | `label`, `error`, `hint`, `leadingIcon`, `trailingIcon`, `size(sm\|md\|lg)` | Labeled input with validation states |
| `statusToVariant(status)` | — | Helper: maps status string → Badge variant (PUBLISHED→success, DRAFT→warning, etc.) |

### Layout
| Component | Purpose |
|-----------|---------|
| `Layout` | App shell: sticky frosted-glass nav, mobile hamburger, footer, theme toggle |
| `MobileBottomNav` | 5-tab bottom nav (Home, Courses, My Learning elevated, Alerts, Profile). Hidden `md+` |

### Auth / Access Control
| Component | Purpose |
|-----------|---------|
| `ProtectedRoute` | Checks auth → redirects `/login`; checks `phone_e164` → shows `PhoneGateModal` |
| `EnrollmentGate` | Full-screen paywall: course info, pricing, "Enroll Now" CTA, trust badges |
| `PhoneGateModal` | Phone number collection modal (E.164 format); blurs children until filled |

### Course UI
| Component | Purpose |
|-----------|---------|
| `CourseCardSkeleton` | Shimmer loading placeholder matching the catalog `CourseCard` shape (no layout shift); also exports `EnrolledCourseSkeleton` + `DashboardSkeleton` |
| `HeroCarousel` | Auto-advancing hero with course cards |
| `AnnouncementBanner` | Top-of-page dismissable banner (from CMS settings) |

### Learning
| Component | Notes |
|-----------|-------|
| `VideoPlayer` | `videoId`, `moduleId`, `fallbackUrl`; exposes ref handle (play/pause/seek/quality/PiP); HLS.js + Bunny CDN; retry on error (3 attempts) |
| `VideoUploader` | Drag-drop chunked/resumable TUS upload to Bunny; max 2GB; calls `admin-video-upload` Edge Function for credentials; exposes `VideoUploaderHandle` (`cancelUpload`) + `onUploadingChange` |
| `ImageUpload` | Drag-drop CMS image uploader; calls `admin-image-upload` Edge Function; returns Bunny Storage Pull-Zone CDN URL |
| `VideoField` | Drag-drop CMS video picker (short muted loops ≤15MB, mp4/webm) OR paste a Bunny CDN URL; uploads via `admin-image-upload`; used for hero-slide videos |
| `StarRating` | Controlled/uncontrolled star input |
| `ReviewForm` | Create/edit review (rating + comment) |
| `ReviewList` | Paginated review display with helpfulness votes |

### Digital Assets
| Component | Notes |
|-----------|-------|
| `AssetCard` | Product card for a digital asset (thumbnail, title, file type badge, price, license); used in `AssetsCatalogSection` and `/assets` shop |
| `AssetUploader` | Signed-URL direct upload for digital asset files; calls `admin-asset-upload` Edge Function for a Supabase Storage signed upload URL; max 500MB; shows progress |
| `OwnedAssetsTab` | "Library" tab rendered inside Dashboard; lists purchased/claimed assets with a download CTA that calls `asset-download-url` Edge Function |

### User Actions
| Component | Purpose |
|-----------|---------|
| `NotificationBell` | Bell icon + dropdown; Supabase Realtime subscription; mark read/all read; type icons |
| `ShareButton` | Web Share API with clipboard fallback |
| `WishlistButton` | Heart toggle; requires auth; optimistic update; tracks `wishlist_added` analytics event |
| `Toast` / `useToast` | Fixed-position toasts (success/error/info); auto-dismiss 3s; stacked multiple |

### Dev / Infrastructure
| Component | Purpose |
|-----------|---------|
| `ErrorBoundary` | Class-based error catcher; Sentry integration; dev-only error details; `withErrorBoundary()` HOC |

---

## Custom Hooks

All hooks live in `hooks/` and are re-exported from `hooks/index.ts`.

| Hook | Returns | Purpose |
|------|---------|---------|
| `useAccessControl(courseId)` | `{hasAccess, isLoading, isEnrolled, isAdmin, checkEnrollment}` | Checks enrollment or admin role; admins always have access |
| `useModuleNotes(courseId, moduleId)` | `{notes, save, isLoading}` | Module notes CRUD (local + DB sync) |
| `useModuleProgress(courseId, activeChapterId, isPlaying, ...)` | `{progressPercent, moduleCompletionMap, showCompletionNotification, checkCompletion}` | 30s auto-save; 95% threshold completion; resume position |
| `useMobileGestures(ref)` | `{onTouchStart, onTouchEnd}` | Swipe left/right detection for mobile module nav |
| `useRealtimeNotifications()` | `{notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refresh}` | Supabase Realtime INSERT subscription on notifications table |
| `useScript(src)` | `{loaded, error}` | Dynamic script tag injection (Razorpay checkout SDK); deduplication guard |
| `useVideoPlayer(videoRef)` | `{isPlaying, currentTime, duration, volume, playbackRate, togglePlay, seek, ...}` | Video UI state abstraction over VideoPlayer ref |
| `useVideoUrl(videoId, lessonId, fallbackUrl, purpose?)` | `{videoUrl, hlsUrl, isLoading, error, refreshUrl}` | Fetches a signed URL from `video-signed-url`; auto-refresh 5min before expiry. `purpose:'trailer'` uses the anonymous public-trailer path (best-effort → poster on failure) |
| `useHlsAttach(videoRef, hlsUrl)` | `void` | Attaches an HLS source to a plain `<video>` (Safari native; else lazy-imports hls.js); used for the CourseDetails trailer hero |
| `useSiteSection(sectionKey)` | `SiteContentItem[] \| null` | CMS rows for one section, from `SiteContentProvider`'s single batched fetch. `null` = not loaded yet → use your hardcoded defaults. Derive copy with `useMemo`, never mirror into state in an effect (that repaints the fallback first — the flash this replaced) |
| `useWishlist(courseId?)` | `{isSaved, toggle, wishlistIds, isLoading}` | Wishlist state; optimistic toggle; loads full list on mount |

---

## API Modules (15 total in `services/api/`)

| Module | Purpose |
|--------|---------|
| `courses.api.ts` | Course + module queries |
| `enrollments.api.ts` | Enrollment access + progress tracking |
| `progress.api.ts` | Module progress + completion logic |
| `checkout.api.ts` | Razorpay order creation + verification for courses and digital assets (`createOrder`, `verifyPayment`, `createAssetOrder`, `verifyAssetPayment`, `claimFreeAsset`, `checkAssetOrderStatus`) |
| `admin.api.ts` | Admin dashboard + CRUD |
| `notifications.api.ts` | User notifications |
| `payments.api.ts` | Payment history + refunds |
| `certificates.api.ts` | User certificates |
| `siteContent.api.ts` | CMS content |
| `siteImages.api.ts` | CMS image upload/delete via Bunny Storage (`siteImagesApi`: uploadImage, deleteImage, pathFromUrl) |
| `reviews.api.ts` | Course reviews CRUD |
| `users.api.ts` | User profile operations |
| `coupons.api.ts` | Coupon validation for courses (`validateCoupon`) and digital assets (`applyAssetCoupon`) |
| `wishlist.api.ts` | User wishlist (favorites) |
| `digitalAssets.api.ts` | Digital asset catalog + entitlement (`digitalAssetsApi`: getAssets, getAsset, getAssetById, getAssetCount, checkOwnership, getOwnedAssets, getDownloadUrl; admin: getAdminAssets, getAdminAsset, createAsset, updateAsset, publishAsset, deleteAsset, restoreAsset) |

---

## Edge Functions (16 total in `supabase/functions/`)

| Function | Auth | Purpose |
|----------|------|---------|
| `admin-asset-upload` | JWT + admin | Returns a Supabase Storage signed upload URL for direct large-file upload to the private `digital-assets` bucket |
| `admin-image-upload` | JWT + admin | Upload CMS images (≤5MB) or short marketing videos (≤15MB, mp4/webm) to Bunny Storage; returns Pull-Zone CDN URL |
| `admin-video-upload` | JWT + admin | Generate Bunny TUS upload credentials |
| `asset-claim-free` | JWT | Grants a price-0 digital asset to the authenticated user without payment |
| `asset-download-url` | JWT | Entitlement-gated short-lived (~5 min) Supabase Storage signed download URL for a purchased asset |
| `certificate-generate` | JWT | Generate PDF certificate + email |
| `checkout-create-order` | JWT | Create Razorpay order — product-aware: accepts `courseId` or `assetId` discriminator |
| `checkout-verify` | JWT | Verify Razorpay payment signature + create enrollment or asset purchase — product-aware |
| `checkout-webhook` | **No JWT** (HMAC) | Razorpay webhook async fallback — product-aware; consumes upgrade credit before granting |
| `course-claim-free` | JWT | Grants a ₹0 course with no payment — genuinely free, or upgrade credit fully covers the bundle (migration 044) |
| `coupon-apply` | JWT | Atomic coupon validation — product-aware: calls `apply_coupon` RPC (courses) or `apply_asset_coupon` RPC (assets) |
| `progress-complete` | JWT | Mark module complete via `complete_module` RPC; trigger certificate |
| `refund-process` | JWT + admin | Initiate Razorpay refund + update records |
| `session-enforce` | JWT | Enforce session validity on login (3s timeout, lenient) |
| `video-cleanup` | JWT + admin | Delete video from Bunny after course module removal |
| `video-signed-url` | JWT (+ anon `purpose:'trailer'`) | Generate SHA256 Bunny CDN signed URL (1hr expiry); lesson path is JWT+entitlement-gated; anonymous `purpose:'trailer'` signs only a PUBLISHED course's `hero_video_id` (refuses any GUID that is also a paid lesson video) — deploy `--no-verify-jwt` |

Shared utilities in `supabase/functions/_shared/`: `cors.ts`, `auth.ts`, `response.ts`, `certificates.ts`, `email.ts`, `emailTemplates.ts` (incl. `assetDeliveryEmail`), `hmac.ts`, `supabaseAdmin.ts`

---

## Types Reference (`types/index.ts`)

**User:** `Role ('USER'|'ADMIN')`, `User {id, name, email, avatar, phone_e164, role, phoneVerified, emailVerified, google_id, created_at, last_login_at}`

**Course:** `CourseType ('BUNDLE'|'MODULE')`, `CourseStatus ('PUBLISHED'|'DRAFT')`, `Course {id, slug, title, description, price(paise), comparePrice(paise|null, display-only MRP), thumbnail, heroVideoId, type, status, rating, totalStudents, features[], chapters?, reviews?, bundledCourses?}`, `CourseWithModules extends Course`

**Module:** `Module {id, courseId, title, duration, durationSeconds, videoUrl, videoId(BunnyGUID), isFreePreview, orderIndex}`

**Enrollment:** `EnrollmentStatus ('ACTIVE'|'EXPIRED'|'REVOKED'|'PENDING')`, `Enrollment {id, userId, courseId, status, paymentId, orderId, amount, expiresAt, completedModules[], currentModule, overallPercent, totalWatchTime}`, `EnrollmentWithCourse extends Enrollment`

**Progress:** `Progress {userId, courseId, moduleId, timestamp, completed, completedAt, watchTime, viewCount}`, `ProgressStats {overallPercent, completedModules, totalModules, totalWatchTime, currentModule}`

**Payment:** `PaymentStatus ('pending'|'captured'|'refunded'|'failed')`, `PaymentOrder {orderId, amount, currency, key, courseTitle}`, `PaymentVerification {success, verified, enrollmentId}`

**Certificate:** `CertificateStatus ('ACTIVE'|'REVOKED')`, `Certificate {id, userId, courseId, certificateNumber, studentName, courseTitle, issueDate, completionDate, downloadUrl, status}`

**Admin:** `AdminStats {totalUsers, activeUsers, totalRevenue, totalCourses, totalEnrollments, totalCertificates}`, `SalesDataPoint {date, amount}`, `AdminUser (extended User)`, `CourseAnalytics {totalEnrollments, completionRate, avgWatchTimeMinutes, revenueTotal, activeStudents30d}`

**Other:** `SiteContentItem {id, section, title, body, metadata, orderIndex, isActive}`, `Coupon {code, discount_pct, max_uses, use_count, expires_at, is_active}`, `WishlistEntry {id, courseId, createdAt}`, `Review {id, userId, rating, comment, helpful}`, `ReviewSummary {total, averageRating, distribution{5,4,3,2,1}}`

**Digital Assets:** `AssetFileType ('LUT'|'PRESET'|'SFX'|'MUSIC'|'OVERLAY'|'PROJECT'|'PDF'|'TEMPLATE'|'OTHER')`, `AssetLicense ('PERSONAL'|'COMMERCIAL'|'EXTENDED')`, `DigitalAsset {id, slug, title, description, price(paise), comparePrice, fileType, license, thumbnail, previewUrl, version, status, downloadCount, deletedAt, timestamps}` (note: `storagePath` is NOT included — server-only), `AdminDigitalAsset extends DigitalAsset` (includes `storagePath`, `fileSizebytes`, `fileExt`, `externalUrl` — admin-only, like storagePath), `AssetPurchase {id, userId, assetId, status, paymentId, orderId, amount, downloadCount, lastDownloadedAt, purchasedAt}`, `AssetPurchaseWithAsset extends AssetPurchase`

---

## Design System

### Tailwind v4 Setup
- Entry: `index.css` uses `@import "tailwindcss"` (not a `tailwind.config.js`)
- Tokens defined in `@theme {}` block inside `index.css`
- Utility classes generated via `@utility` declarations
- Dark mode: `.dark` class on `<html>` element (user toggle, stored in localStorage)

### CSS Custom Properties (Light / Dark via `.dark`)
| Category | Variables |
|----------|-----------|
| Surface | `--page-bg`, `--page-alt`, `--surface`, `--surface-hover`, `--border` |
| Text | `--text-1` (primary), `--text-2` (secondary/muted), `--text-3` (placeholder) |
| Nav | `--nav-bg` (frosted glass: rgba 255,255,255,0.9 / rgba 0,0,0,0.80), `--nav-border` |
| Status | Each has `-bg`, `-text`, `-border`: `--status-success-*`, `--status-warning-*`, `--status-danger-*`, `--status-info-*` |
| Shadows | `--shadow-brand` (brand-red glow), `--shadow-elevated` (card depth) |

### Tailwind Utility Classes (always prefer these over raw colors)
`t-bg`, `t-bg-alt`, `t-card`, `t-text`, `t-text-2`, `t-text-3`, `t-border`, `t-input-bg`, `t-nav`, `t-nav-border`, `t-divide`, `t-status-success`, `t-status-warning`, `t-status-danger`, `t-status-info`

**Rule:** Always use token utilities (`t-bg`, `t-text`) and semantic CSS vars. Never hardcode colors (`bg-white`, `text-gray-900`).

---

## Testing Patterns

**Stack:** Vitest 4.x, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom

**Test file structure:**
```
src/__tests__/
  setup.ts                   — global mocks: matchMedia, IntersectionObserver, localStorage
  services/                  — 7 API service test files
  hooks/                     — 4 hook tests (useVideoUrl, useScript, useAccessControl, useModuleProgress)
  components/                — 3 component tests (EnrollmentGate, Layout, ErrorBoundary)
  pages/                     — 4 page tests (Storefront, Dashboard, Checkout, Learn)
__mocks__/                   — static mock files
```

**Core Supabase Mock Pattern:**
```ts
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    rpc: vi.fn()
  }
}));
vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));
```

**Query Chain Pattern:**
```ts
mockSupabase.from.mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: {...}, error: null })
    })
  })
});
```

**API Module Mock Pattern (page tests):**
```ts
const { mockApi } = vi.hoisted(() => ({ mockApi: { getUsers: vi.fn() } }));
vi.mock('../../../services/api', () => ({ usersApi: mockApi }));
```

**Coverage:** 50% threshold (V8 provider). Run: `npm run test:coverage`

---

## Known Issues

### Bugs
1. ~~**Privacy/Terms pages show `new Date()` as "Last Updated"**~~ — **RESOLVED** (March 2026): hardcoded to "March 14, 2026" in both pages
2. ~~**`getCourse()` has fragile `startsWith('c')` heuristic**~~ — **RESOLVED** (March 2026): replaced with UUID regex + `.or(slug.eq,id.eq)` query
3. ~~**`reviews.api.ts` double-fetches**~~ — **RESOLVED** (March 2026): now calls `get_review_summary` RPC (added in migration 023)
4. ~~**Video player broken on dev domain (4 compounding issues)**~~ — **RESOLVED** (March 26, 2026):
   - `useVideoUrl`: removed Phase 1 CDN URL pre-serve (unsigned → 403 with token auth enabled)
   - `video-signed-url`: switched to path-based Bunny token so HLS.js sub-requests inherit auth
   - `video-signed-url`: fixed SHA256 hash input to include `sortedParams = "token_path=/{videoId}/"`
   - `public/_headers`: added `media-src 'self' blob: https://*.b-cdn.net; worker-src blob:;` for HLS.js MediaSource API
   - `VideoPlayer.tsx`: moved `hlsErrorFiredRef.current = true` before recovery attempt (race condition fix)
   - `useVideoPlayer.ts`: `handleLevelsLoaded` now clears `videoError` on successful HLS manifest parse

### Security Gaps
5. ~~**Dev credentials in production bundle**~~ — **RESOLVED** (March 2026): `loginDev()` gated behind `import.meta.env.DEV`; tree-shaken from production builds
6. ~~**No column-level RLS on `role`**~~ — **RESOLVED** (March 2026): `prevent_role_change` BEFORE UPDATE trigger added in migration 022
7. ~~**PostgREST filter injection**~~ — **RESOLVED** (March 2026): `escapeOrFilter()` helper added to `admin.api.ts`; all `.or()` interpolations now sanitized

### Tech Debt
8. **`types/supabase.ts` has stale `sessions`/`refresh_tokens` tables** — dropped during auth migration; migrations 022+023 are applied but types not yet regenerated (requires Docker); run `/gen-db-types` when Docker is available
9. **No server state caching** — every navigation triggers full re-fetch; no deduplication or stale-while-revalidate; opportunity for TanStack Query (not started)
10. ~~**No error boundaries around admin pages**~~ — **RESOLVED** (March 2026): `AdminErrorFallback` component added to `AdminLayout.tsx` with "Return to Admin Dashboard" link

### Remaining Open Items
- **`types/supabase.ts` regeneration** — pending Docker availability (item 8 above)
- ~~**Admin page unit tests**~~ — **RESOLVED** (March 2026): all 12 admin pages have unit tests
- **TanStack Query migration** — not started; all pages still use raw `useEffect`/`useState`
- ~~**HashRouter vs standard routing**~~ — **RESOLVED**: migrated to `BrowserRouter` with SPA fallback (`public/_redirects` → `/* /index.html 200`); public pages are now crawlable (see ADR-006)
- ~~**CMS section coverage gaps**~~ — **RESOLVED** (June 21, 2026): migration 033 widened `site_content.section` CHECK to 18 keys; all landing sections now CMS-driven; `admin-image-upload` Edge Function + `siteImages.api.ts` + `ImageUpload` component enable image fields; `sectionSchemas.ts` is single source of truth for admin sub-forms

---

## Import Conventions

- Pages/components import from `services/api/` directly (the canonical layer)
- Use `import type {}` for type-only imports
- Use relative paths (not `@/` alias)
- Import order: external deps > internal modules > components > types

## Edge Function Conventions

- Import shared helpers from `../_shared/` (cors, auth, response, etc.)
- Return JSON: `{ success: boolean, error?: string, ...data }`
- Use `getCorsHeaders(req)` from `_shared/cors.ts`
- Log as: `console.error('[FunctionName] Context:', error)`

## Commands

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm test               # Run tests (Vitest)
npm run test:coverage  # Coverage report (50% threshold)
npm run lint           # ESLint
npm run verify:migrations   # Replay all migrations against a throwaway local Postgres
npm run type-check     # TypeScript check
supabase db reset      # Reset local DB + migrations + seed
supabase functions deploy  # Deploy Edge Functions
```

## Environment

- Frontend env vars are `VITE_` prefixed (public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`
- Server secrets set via `supabase secrets set` (Razorpay, Bunny, Resend keys)
- `tsconfig.json` excludes `server/` and `supabase/` directories

## Important Files

- `index.tsx` — Entry point (handles OAuth callback before React renders)
- `App.tsx` — Routes + providers (BrowserRouter)
- `index.css` — Tailwind v4 entry (`@import "tailwindcss"`) + `@theme {}` token block
- `services/supabase.ts` — Supabase client singleton
- `context/AuthContext.tsx` — Auth state management (Google OAuth + dev mode)
- `context/SiteContentContext.tsx` — batched CMS loader + `useSiteSection`; kills the flash of hardcoded fallback copy
- `scripts/verify-migrations.sh` — replays migrations against a throwaway local Postgres (`npm run verify:migrations`)
- `utils/analytics.ts` — PostHog wrapper (`track()`, `identify()`, `page()`)
- `supabase/migrations/` — **SQL migrations 001-051** (file gaps at 030/031, applied from another branch); next = 052. 051 = enrollment grant-column guard (closes a paywall bypass); 050 = about_page CMS section (rescues About copy stranded in a footer_links body); 049 = footer_links + course_includes CMS sections; 048 = digital_assets.external_url (link delivery); 047 = courses.compare_price (offer vs actual price); 046 = how_it_works_steps CMS section. 042 = security hardening; 043 = bundle_assets; 044 = upgrade_pricing (module→bundle credit); 045 = coupon re-issue
  - ⚠️ **Never run `supabase db push` on this project.** Remote history holds 030/031 with no local files AND is missing 041-045, which are applied. `db push` would replay them. Apply migrations as raw SQL — see `docs/operations/AUG_INTEGRATION_GO_LIVE.md`.
  - Verify migrations before applying: `npm run verify:migrations 046 047 048` (needs `brew install postgresql@16`; no Docker).
- `supabase/functions/` — **16 Edge Functions** (see Edge Functions section above)
- `pages/admin/content/sectionSchemas.ts` — `SECTION_SCHEMAS` registry; single source of truth for CMS section keys + admin sub-form shape; must stay in sync with migration 033 CHECK constraint
- `supabase/functions/_shared/emailTemplates.ts` — Branded email templates (enrollment welcome, payment receipt, certificate, asset delivery)
- `types/index.ts` — Business types (25+ interfaces/enums)
- `types/supabase.ts` — Auto-generated DB types (run `/gen-db-types` to refresh; pending Docker)

---

## Slash Commands (Skills)

49 custom skills in `.claude/skills/` for the full dev lifecycle. Type `/` in Claude Code to invoke. Authored to [`SKILLS_STANDARDS.md`](./SKILLS_STANDARDS.md); validated by `npm run lint:skills`.

### Scaffolding
| Command | Purpose |
|---------|---------|
| `/new-component <Name>` | React component + barrel export + type-check |
| `/new-page <Name> [--public] [--admin] [--path /x]` | Page + lazy route registration |
| `/new-api-service <domain>` | Supabase API service module + barrel export |
| `/new-edge-function <name> [--no-auth] [--admin-only]` | Edge Function with shared helpers |
| `/new-migration <description>` | Auto-numbered SQL migration |
| `/new-feature <name> <description> [--admin]` | Full-stack scaffold: migration + API + component + page + tests |
| `/new-webhook <name> [--provider razorpay\|custom]` | Webhook Edge Function with HMAC signature verification |
| `/design-component <Name> <description> [--lms]` | Component with Tailwind v4 tokens + Storybook story |

### Quality & Testing
| Command | Purpose |
|---------|---------|
| `/run-tests [file-or-pattern]` | Smart test runner with failure analysis |
| `/pre-commit` | Full CI pipeline: lint -> type-check -> test -> build |
| `/test-coverage` | Vitest coverage report + uncovered path analysis |
| `/e2e-test [flow]` | Playwright E2E: login\|checkout\|enrollment\|video\|admin\|all |
| `/rls-test [table]` | Assert RLS policies for anon/user/admin roles |
| `/test-visual-regression [--update-baseline]` | Screenshot diff against baselines |

### Database
| Command | Purpose |
|---------|---------|
| `/gen-db-types` | Regenerate `types/supabase.ts` from live schema |
| `/inspect-rls <table>` | Audit RLS policies with access matrix |
| `/audit-db-schema` | Find missing indexes, RLS gaps, FK issues |
| `/rollback-migration [n]` | Preview + revert last N migrations |
| `/seed-database` | Reset + seed local DB with realistic test data |
| `/backup-database` | Dump DB to timestamped SQL file |

### DevOps & Environment
| Command | Purpose |
|---------|---------|
| `/setup-local-dev` | One-command local environment setup for new devs |
| `/health-check` | Ping all services: Supabase, Edge Functions, Razorpay, Bunny, CF |
| `/env-diff` | Compare env vars across local/.env, Supabase secrets, CF Pages |

### Deployment
| Command | Purpose |
|---------|---------|
| `/deploy-frontend [--dev]` | Validate + build + deploy to Cloudflare Pages |
| `/deploy-edge-functions [name \| --all]` | Deploy Edge Functions to Supabase |
| `/deploy-all [--dev]` | Full pipeline: DB -> functions -> frontend |
| `/promote-to-prod` | Full quality gate (lint+types+tests+E2E+a11y+perf) then deploy |

### Monitoring & Observability
| Command | Purpose |
|---------|---------|
| `/perf-audit` | Lighthouse CI + Vite bundle analysis with optimization tips |
| `/log-tail [function]` | Stream Edge Function logs, group errors, suggest fixes |
| `/error-report` | Summarize errors across frontend + Edge Functions (24h) |

### Security
| Command | Purpose |
|---------|---------|
| `/audit-security [scope]` | Security audit (rls, auth, edge-functions, input, all) |
| `/audit-dependencies` | npm audit + CVE summary + fix commands |
| `/check-exposed-secrets` | Scan codebase + git history for leaked API keys |
| `/rotate-secrets` | Step-by-step guide to rotate all production secrets |

### Documentation
| Command | Purpose |
|---------|---------|
| `/debug-trace <component-or-error>` | Trace data flow: UI -> API -> Supabase -> RLS |
| `/erd-diagram` | Mermaid ERD from SQL migrations → `docs/erd.md` |
| `/architecture-diagram` | Mermaid system diagram → `docs/architecture.md` |
| `/changelog` | Keep a Changelog entry from git commits since last tag |
| `/generate-docs` | Markdown API docs from all `services/api/*.api.ts` modules |
| `/new-doc <type> <title> [desc]` | Scaffold a new doc from the correct template + log to registry |
| `/update-doc <path> <reason>` | Update last-updated date + log the change to registry |

### Design & Assets
| Command | Purpose |
|---------|---------|
| `/audit-a11y <target>` | WCAG 2.1 AA audit via axe-core + remediation steps |
| `/sync-design-tokens <figma-url>` | Sync Figma tokens to Tailwind v4 `@theme` |
| `/generate-storybook-stories` | Auto-generate stories for all components missing them |
| `/generate-course-assets <name> <desc> <category>` | Create course thumbnail via Canva MCP |

### Meta / Self-Configuration
| Command | Purpose |
|---------|---------|
| `/setup-hooks` | Configure `.claude/settings.json` with all recommended project hooks |
| `/setup-mcp` | Guide setup of MCP servers (Canva, GitHub, Playwright) |
| `/add-auto-trigger` | Add a new intent → skill auto-trigger rule to CLAUDE.md |
| `/github-actions-review` | Scaffold GitHub Actions workflow for Claude Code PR reviews |

---

## Auto-Skill Triggers

Claude MUST automatically invoke the following skills based on user intent — without waiting to be asked. These are standing instructions that apply every session.

| User says / does | Claude auto-invokes |
|-----------------|---------------------|
| "commit", "save changes", "push", "check before commit", "CI check", "lint and test", "is this ready to merge", "validate my code" | `/pre-commit` first, then proceed |
| "deploy to prod" / "go live" / "ship it" / "release to production" / "promote to prod" | `/promote-to-prod` (never skip quality gate) |
| "deploy to dev" / "deploy to staging" / "push to dev" | `/deploy-frontend --dev` |
| "deploy frontend" / "deploy the site" / "push the frontend" | Ask prod vs dev, then `/deploy-frontend` or `/deploy-frontend --dev` |
| "deploy edge functions" / "deploy functions" / "push functions" | `/deploy-edge-functions` |
| "deploy everything" / "deploy all" / "full deploy" | `/deploy-all` |
| "add a feature" / "build X feature" / "implement X feature" / "scaffold a feature" | `/new-feature` |
| "create a component" / "make a component" / "build a component" / "new component" / "I need a X component" | `/design-component` |
| "create a page" / "make a page" / "add a page" / "new page" / "I need a X page" | `/new-page` |
| "scaffold a component" (simple, no design) | `/new-component` |
| "add an API service" / "new API module" / "create a service for X" | `/new-api-service` |
| "add a migration" / "create a migration" / "new DB migration" / "add a table" / "add a column" | `/new-migration`, then remind to run `/rls-test` |
| "scaffold an edge function" / "new edge function" / "add a function" | `/new-edge-function` |
| "create a webhook" / "add a webhook" / "incoming webhook" | `/new-webhook` |
| "run the tests" / "run tests" / "test this" / "just run tests" | `/run-tests` |
| "test coverage" / "what's covered" / "coverage report" | `/test-coverage` |
| "run e2e" / "run end-to-end tests" / "test the login flow" / "test checkout" | `/e2e-test` |
| "visual regression" / "screenshot diff" / "check for UI regressions" | `/test-visual-regression` |
| "check accessibility" / "a11y audit" / "WCAG audit" / "is this accessible?" | `/audit-a11y` |
| "something's broken in prod" / "prod is down" / "errors in prod" | `/log-tail` then `/error-report` |
| "check the logs" / "tail logs" / "show function logs" / "what are the errors?" | `/log-tail` |
| "error report" / "recent errors" / "summarize errors" | `/error-report` |
| "check if everything is working" / "is everything up?" / "ping services" / "service status" | `/health-check` |
| "something's slow" / "site is slow" / "performance audit" / "check bundle size" / "Lighthouse" | `/perf-audit` |
| "trace this bug" / "trace data flow" / "debug X" / "something's broken in X" / "why is X not working?" | `/debug-trace` |
| "security audit" / "check for vulnerabilities" / "audit the code" | `/audit-security` |
| "check for secrets" / "any leaks?" / "scan for API keys" / "secret leak check" | `/check-exposed-secrets` |
| "audit dependencies" / "check npm audit" / "any CVEs?" / "vulnerable packages?" | `/audit-dependencies` |
| "rotate secrets" / "rotate API keys" / "update credentials" | `/rotate-secrets` |
| "before we run this migration on prod" / "backup the DB" / "dump the database" | `/backup-database` automatically before proceeding |
| "rollback migration" / "undo migration" / "revert last migration" | `/rollback-migration` |
| "seed the database" / "reset and seed" / "populate test data" | `/seed-database` |
| "inspect RLS" / "check RLS policies" / "audit RLS for X table" | `/inspect-rls` |
| "audit the schema" / "find missing indexes" / "schema audit" | `/audit-db-schema` |
| "regenerate types" / "update DB types" / "gen types" / "sync supabase types" | `/gen-db-types` |
| "generate docs" / "document the API" / "API documentation" | `/generate-docs` |
| "generate ERD" / "draw the schema" / "entity diagram" | `/erd-diagram` |
| "architecture diagram" / "draw the architecture" / "system diagram" | `/architecture-diagram` |
| "generate changelog" / "what changed since last release?" | `/changelog` |
| "create a doc" / "write a doc" / "document this" / "I need a doc for X" / "add documentation for X" | `/new-doc` |
| "update the docs" / "docs are outdated" / "update the doc for X" | `/update-doc` |
| "add an ADR" / "record this decision" / "write an ADR for X" | `/new-doc adr` |
| "add a runbook" / "write a runbook for X" | `/new-doc operations` |
| "add a guide for X" | `/new-doc guide` |
| "generate Storybook stories" / "add stories for components" | `/generate-storybook-stories` |
| "sync design tokens" / "update tokens from Figma" / "import Figma tokens" | `/sync-design-tokens` |
| "generate course assets" / "create course thumbnail" / "course banner" | `/generate-course-assets` |
| "set up local dev" / "onboard a new dev" / "fresh setup" | `/setup-local-dev` |
| "compare env vars" / "env diff" / "missing env vars?" | `/env-diff` |
| "set up MCP" / "configure MCP servers" | `/setup-mcp` |
| "set up hooks" / "configure Claude hooks" | `/setup-hooks` |
| "add an auto-trigger" / "add a new skill trigger" | `/add-auto-trigger` |
| "set up GitHub Actions for Claude" / "CI review workflow" | `/github-actions-review` |
| User edits any `supabase/migrations/*.sql` | Remind user to run `/rls-test` after |
| User edits any `components/*.tsx` | Remind user to run `npm run type-check` |

**Rule:** When the user's intent clearly maps to one of the above, invoke the skill proactively. Announce what you're doing ("Invoking /skill-name...") so the user understands the automation.

---

## Docs Directory

Comprehensive docs live in `/docs` — consult before writing new architecture or making structural decisions:

```
docs/
  adr/                     — Architecture Decision Records (5 ADRs)
  architecture/
    SYSTEM_OVERVIEW.md    — Full tech stack + data flow diagrams
    DATABASE_SCHEMA.md    — All tables, columns, relationships, RLS policies
    SECURITY_MODEL.md     — Auth, RLS, payment security, URL signing
    ACCESS_CONTROL.md     — Route protection, role-based access matrix
  api/
    SERVICE_MODULES.md    — All 14 API modules with function signatures
    EDGE_FUNCTIONS.md     — All 12 Edge Functions + _shared utilities
  archive/                 — Archived v1 documentation
  reference/
    COMPONENTS.md         — All components with props + usage examples
    DESIGN_SYSTEM.md      — CSS tokens + Tailwind v4 utility classes
    HOOKS.md              — All hooks with signatures + return values
    USER_FLOWS.md         — User journey diagrams
  guides/
    DEVELOPMENT_SETUP.md  — Local dev setup from scratch
    DEPLOYMENT.md         — CF Pages + Supabase deploy process
    TESTING.md            — Vitest config + writing tests
    TESTING_STRATEGY.md   — Overall testing strategy
    ADMIN_PANEL.md        — Admin features + workflows
    ADMIN_TEST_GUIDE.md   — Guide for writing admin page tests
    JSDOC_GUIDE.md        — JSDoc conventions
    PERFORMANCE_GUIDE.md   — Performance optimization guide
    TROUBLESHOOTING.md    — Common issues + fixes
  operations/
    ADMIN_RUNBOOK.md      — Production admin procedures
    INCIDENT_RESPONSE.md  — Incident response playbook
  project/
    KNOWN_ISSUES.md       — Bugs, security concerns, tech debt tracker
    LAUNCH_CHECKLIST.md   — Pre-launch verification checklist
    TASK_OWNERSHIP.md     — AI vs Owner task split
    TEST_PLAN.md          — Comprehensive test plan
```

Root docs: `README.md`, `CODING_STANDARDS.md`, `SECURITY_STANDARDS.md`, `CONTRIBUTING.md`, `SUPABASE_SETUP.md`, `DOCUMENTATION_STANDARDS.md`, `CLAUDE.md`
