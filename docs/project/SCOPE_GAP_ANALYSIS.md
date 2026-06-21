# Eyebuckz LMS -- Scope Gap Analysis Report

**Date:** 2026-05-29
**Source:** Cross-referenced synthesis from 8 parallel audits: Features, Testing, Security, Performance, Docs, DevOps, A11y, Code Quality.
**Total Unique Gaps:** 92 (6 P0 / 24 P1 / 34 P2 / 28 P3)

---

## 1. Executive Summary

The Eyebuckz LMS project has made substantial progress toward launch readiness -- the core learning experience functions end-to-end, the admin panel is feature-complete, all 11 Edge Functions are deployed, and the test suite covers 12 admin pages, 4 main pages, 7 API service modules, and 4 hooks. However, a systematic cross-functional audit reveals **six critical launch blockers (P0)** and **twenty-four high-severity gaps (P1)** that must be addressed before production deployment.

The most concerning findings cluster in the **security domain**: three SECURITY DEFINER RPCs allow authenticated users to act on behalf of other users via unrestricted `p_user_id` parameters (an IDOR vector), four aggregate-data RPCs expose revenue and sales data to any authenticated user because they lack an `is_admin()` gate, the `progress-complete` Edge Function allows certificate achievement by simply omitting the watch-time parameters, and zero rate limiting exists on any of the 11 Edge Functions -- an attacker could exhaust Razorpay order creation, brute-force coupons, or generate unlimited signed video URLs.

Beyond security, critical infrastructure gaps include **no automated database backups** for a system processing payments and certificates, **TypeScript `strict: true` disabled** across 80+ source files (enabling it would surface 100+ latent null-pointer bugs), and **zero Edge Function test coverage** for code paths that handle payments, video DRM, and certificate issuance. The estimated total effort to close all P0 items is approximately 3-4 weeks of focused development. Closing P0 plus the highest-impact P1 items brings the estimate to 6-8 weeks. A phased approach is recommended: secure the RPC layer and add backups first (Week 1-2), then address rate limiting, Edge Function testing, and TypeScript strict mode (Week 3-4), followed by the remaining P1 items prioritized by user-facing impact.

---

## 2. Critical Path to Launch (P0 Items Only)

These six items **must** be resolved before the platform can accept real paying users. Estimated total effort: **~15-18 developer-days**.

| # | Gap | Effort | Est. Days | Dependency |
|---|-----|--------|-----------|------------|
| P0-1 | SECURITY DEFINER IDOR in `complete_module`, `get_progress_stats`, `increment_view_count` | M | 3 | None |
| P0-2 | Aggregate data leak in `get_admin_stats`, `get_sales_data`, `get_recent_activity`, `get_course_analytics` | S | 1 | None |
| P0-3 | No rate limiting on any Edge Function | M | 3 | P0-1, P0-2 (can parallel) |
| P0-4 | Progress completion bypass via omitted `currentTime`/`duration` | S | 0.5 | None |
| P0-5 | No automated database backups | M | 3 | Supabase project access |
| P0-6 | TypeScript `strict: true` missing | L | 5-7 | None (incremental) |

**Recommended order of attack:**
1. **Days 1-2:** P0-4 (fastest fix, closes certificate cheating vector) + P0-2 (add `is_admin()` gates, 4 lines total)
2. **Days 3-6:** P0-1 (audit all 17 SECURITY DEFINER functions, add `auth.uid()` checks or admin gates; requires careful testing)
3. **Days 7-10:** P0-5 (set up pg_dump cron, off-site storage, restore test) + P0-3 (design rate-limit middleware for Deno Edge Functions, apply to all 11 endpoints)
4. **Days 11-17:** P0-6 (enable `strict` incrementally, fix surfaced errors; highest raw effort but parallelizable with other work)

---

## 3. Detailed Findings by Domain

### 3.1 Features

**Summary:** 10 gaps (0 P0 / 3 P1 / 4 P2 / 3 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| F-1 | 🟠 P1 | [M] | **Bundle pricing broken** -- checkout uses raw `course.price` for bundles; `bundledCourses` hardcode `price: 0`; no savings display | `services/api/courses.api.ts:163-306`, `supabase/functions/checkout-create-order/index.ts`, `types/index.ts` | Compute bundle price as sum of constituent courses minus a configurable discount percentage; display savings in checkout UI |
| F-2 | 🟠 P1 | [M] | **Full-text search missing** -- client-side `String.includes()` on max 12 loaded courses; no PostgreSQL FTS, GIN indexes, or `tsvector` | `services/api/courses.api.ts`, `CatalogSection.tsx:48`, `useStorefrontFilters.ts:64` | Add `tsvector` column to `courses`, GIN index, `websearch_to_tsquery` RPC; wire to search bar |
| F-3 | 🟠 P1 | [S] | **SettingsPage section constraint mismatch** -- frontend references `'settings'` section but DB constraint (migration 013) only allows `'faq','testimonial','showcase','banner'` | `pages/admin/SettingsPage.tsx`, `supabase/migrations/013_site_content.sql` | Add `'settings'` to the CHECK constraint in a new migration (028) or remove the settings section from the frontend |
| F-4 | 🟡 P2 | [XL] | **Quizzes/assessments not found** -- zero quiz tables, components, or Edge Functions | New tables, RPCs, Edge Functions, components | Post-launch feature; design quiz schema as migration 030+ |
| F-5 | 🟡 P2 | [XL] | **Instructor/teacher role missing** -- only USER/ADMIN exist | New role ENUM value, RLS policies, tables, dashboard | Post-launch feature; requires role hierarchy redesign |
| F-6 | 🟡 P2 | [M] | **Course categories/tags missing** -- only `course_type` ENUM (BUNDLE/MODULE) | New tables, migration, filter UI | Add `course_categories` + `course_tags` junction tables; wire to filters |
| F-7 | 🟡 P2 | [M] | **Drip content / scheduled release missing** -- all modules available immediately | `types/index.ts` (Module type), new migration | Add `release_at` timestamp to modules; gate access in `useAccessControl` |
| F-8 | 🟢 P3 | [S] | **Certificate expiry/renewal** -- no time-based expiration | New migration | Add `expires_at` to certificates table; optional post-launch |
| F-9 | 🟢 P3 | [M] | **Free trials partial** -- module-level preview exists; no full-course trial | New enrollment status, access logic | Add `TRIAL` enrollment status with expiry; post-launch |
| F-10 | 🟢 P3 | [XL] | **Multi-language / i18n** -- all strings hardcoded in English | Entire codebase | Defer to post-launch; requires i18n framework selection |

### 3.2 Testing

**Summary:** 10 gaps (0 P0 / 3 P1 / 5 P2 / 2 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| T-1 | 🟠 P1 | [L] | **Edge Functions 0% tested** -- 11 functions + 8 shared utilities handle payments, video DRM, certificates with zero coverage | All 19 files in `supabase/functions/` | Write Deno test suite using `supabase/functions/_shared/*` mocks; prioritize: checkout-verify, progress-complete, video-signed-url, checkout-webhook |
| T-2 | 🟠 P1 | [L] | **No integration tests** -- all API tests use fully mocked Supabase; no real query chain validation | Test infrastructure (new) | Set up a test Supabase project; write integration tests for critical paths (checkout, enrollment, progress completion) |
| T-3 | 🟠 P1 | [M] | **No error boundaries on individual lazy routes** -- Storefront/Dashboard/Checkout crashes take down entire app | `App.tsx:36-50` | Wrap each `Suspense` boundary with an `ErrorBoundary` using route-specific fallback UI |
| T-4 | 🟡 P2 | [L] | **20 components untested (39% component coverage)** -- CourseCard, CertificateView, AnimatedCounter, 12 section components | `CourseCard.tsx`, `CertificateView.tsx`, all `components/sections/*.tsx` | Write unit tests for top 5 most-used untested components: CourseCard, CertificateView, CourseDetailsSidebar, SearchBar, StatsCard |
| T-5 | 🟡 P2 | [XL] | **11 E2E flows missing** -- Dashboard, Learn, Profile, Wishlist, Search, Payment failure, Certificate download, PhoneGate, Mobile nav, Admin editor, Admin users | `e2e/` directory | Add flows incrementally; prioritize: Dashboard, Learn, Admin editor |
| T-6 | 🟡 P2 | [M] | **No visual regression tests** -- no screenshot diff tooling | New tooling | Integrate Playwright screenshot comparison or Percy; start with Storefront and Checkout |
| T-7 | 🟡 P2 | [M] | **2 hooks untested** -- `useScrollParallax`, `useVideoPlayer` | `hooks/useScrollParallax.ts`, `hooks/useVideoPlayer.ts` | Write unit tests; `useVideoPlayer` is high-priority due to video playback criticality |
| T-8 | 🟡 P2 | [S] | **4 utils untested** -- `edgeFunctionError.ts`, `generateCertificatePdf.ts`, `logger.ts`, `supabaseUtils.ts` | `utils/edgeFunctionError.ts`, etc. | Write unit tests for `supabaseUtils.ts` first (used across all API modules) |
| T-9 | 🟢 P3 | [L] | **No error state testing** -- network failures, API timeouts, empty states not systematically covered | Test files across `src/__tests__/` | Add error-state test cases to existing test files incrementally |
| T-10 | 🟢 P3 | [S] | **`prettier` missing from devDependencies** -- `npm run format` references uninstalled binary | `package.json` | `npm install --save-dev prettier` |

### 3.3 Security

**Summary:** 12 gaps (4 P0 / 0 P1 / 4 P2 / 4 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| S-1 | 🔴 P0 | [M] | **SECURITY DEFINER IDOR** -- `complete_module(p_user_id)`, `get_progress_stats(p_user_id)`, `increment_view_count(p_user_id, ...)` accept arbitrary user IDs with no `auth.uid()` check | `supabase/migrations/002_functions.sql`, `008_schema_fixes.sql`, `011_increment_view_count.sql` | Add `IF p_user_id != auth.uid() THEN RAISE EXCEPTION` to each function; alternatively, remove `p_user_id` parameter and derive from `auth.uid()` internally |
| S-2 | 🔴 P0 | [S] | **Aggregate data leak** -- `get_admin_stats()`, `get_sales_data()`, `get_recent_activity()`, `get_course_analytics()` lack `is_admin()` gate | `supabase/migrations/002_functions.sql:107-178`, `006_production_gaps.sql:155` | Add `IF NOT is_admin() THEN RAISE EXCEPTION 'Access denied'` as the first line of each function |
| S-3 | 🔴 P0 | [M] | **No rate limiting on any Edge Function** -- unlimited Razorpay order creation, coupon brute-forcing, signed-URL generation | All 11 `supabase/functions/*/index.ts` | Implement a `_shared/rateLimit.ts` module with in-memory token bucket (per-user, per-IP); apply to checkout-create-order (5/min), coupon-apply (10/min), video-signed-url (30/min) |
| S-4 | 🔴 P0 | [S] | **Progress completion bypass** -- omitting `currentTime`/`duration` skips the 95% watch threshold | `supabase/functions/progress-complete/index.ts:61-79` | Make `currentTime` and `duration` required parameters; return 400 if missing; validate `currentTime / duration >= 0.95` before calling `complete_module` RPC |
| S-5 | 🟡 P2 | [S] | **8 API methods lack defense-in-depth user_id filters** -- rely solely on RLS | `payments.api.ts:72,86`, `certificates.api.ts:43`, `notifications.api.ts:39`, `reviews.api.ts:124-147` | Add `.eq('user_id', user.id)` filters as defense-in-depth; protects if RLS is accidentally disabled |
| S-6 | 🟡 P2 | [S] | **Webhook replay protection incomplete** -- `checkout-webhook` does not track `X-Razorpay-Event-Id` | `supabase/functions/checkout-webhook/index.ts:77-139` | Store `razorpay_event_id` in `payments` table; skip processing if already seen |
| S-7 | 🟡 P2 | [S] | **`checkout-webhook` lacks idempotency for side effects** -- duplicate payment records and notifications possible | `supabase/functions/checkout-webhook/index.ts` | Use DB UNIQUE constraint on `razorpay_event_id` as idempotency guard |
| S-8 | 🟡 P2 | [S] | **`login_attempts` INSERT restricted to admins** -- dead table, no brute-force audit trail | `supabase/migrations/008_schema_fixes.sql:97-99` | Add RLS policy allowing `INSERT` with `(user_id = auth.uid())` or make the insert happen in a SECURITY DEFINER function |
| S-9 | 🟢 P3 | [S] | **17 SECURITY DEFINER functions lack `SET search_path = ''`** -- search_path privilege escalation vector | All migrations with SECURITY DEFINER functions | Add `SET search_path = ''` to every SECURITY DEFINER function; create migration 028 |
| S-10 | 🟢 P3 | [S] | **`escapeOrFilter()` does not escape `.` (period)** -- PostgREST special character | `utils/supabaseUtils.ts:13` | Add `.` to the regex character class in `escapeOrFilter()` |
| S-11 | 🟢 P3 | [S] | **`VITE_SENTRY_DSN` unset; no Edge Function error tracking** -- checkout/video/certificate failures are invisible | `index.tsx`, `.env.example`, all 11 Edge Functions | Set `VITE_SENTRY_DSN`; add Sentry SDK to Edge Function `_shared/` layer |
| S-12 | 🟢 P3 | [M] | **Social login beyond Google only** -- no GitHub/Facebook/etc. | `supabase/config.toml`, `pages/Login.tsx` | ~1h per provider; defer to post-launch unless user demand exists |

### 3.4 Performance

**Summary:** 16 gaps (0 P0 / 6 P1 / 5 P2 / 5 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| P-1 | 🟠 P1 | [S] | **21/24 images missing `loading="lazy"`** -- below-fold images load eagerly | `CourseCard.tsx:25`, `Dashboard.tsx:158-376`, `HeroCarousel.tsx:66`, `EnrollmentGate.tsx:50`, `CertificateView.tsx:338-387`, `ReviewList.tsx:203`, `CheckoutSummary.tsx:66` | Add `loading="lazy"` to all `<img>` tags that are not in the initial viewport (keep first 2-3 hero images eager) |
| P-2 | 🟠 P1 | [M] | **Zero `React.memo` usage** -- CourseCard, VideoPlayer, HeroCarousel, NotificationBell, ReviewList re-render on every parent change | `CourseCard.tsx`, `VideoPlayer.tsx`, `HeroCarousel.tsx`, `NotificationBell.tsx`, `ReviewList.tsx`, `CourseDetailsSidebar.tsx`, `StatsCard.tsx` | Wrap top-5 re-rendering components in `React.memo` with custom comparators where needed |
| P-3 | 🟠 P1 | [S] | **`jspdf`/`html2canvas` (~200KB) loaded synchronously on Profile page** | `pages/Profile.tsx:5`, `utils/generateCertificatePdf.ts` | Dynamic `import()` for `jspdf` and `html2canvas` only when user clicks "Download Certificate" |
| P-4 | 🟠 P1 | [S] | **No poster/thumbnail before HLS video loads** -- black screen + spinner for 5-10s | `components/VideoPlayer.tsx:400-449` | Fetch and display Bunny thumbnail (`https://{cdn}/{videoId}/thumbnail.jpg`) immediately; load HLS behind it |
| P-5 | 🟠 P1 | [S] | **Google Fonts CSS blocks rendering** | `index.html:36` | Use `media="print" onload="this.media='all'"` pattern or `<link rel="preload" as="style">` with `rel="stylesheet"` fallback |
| P-6 | 🟠 P1 | [M] | **Full-text search missing** -- client-side `.includes()` (also listed under Features) | `services/api/courses.api.ts`, `CatalogSection.tsx:48`, `useStorefrontFilters.ts:64` | Same recommendation as F-2: PostgreSQL FTS with GIN index |
| P-7 | 🟡 P2 | [S] | **N+1 queries in `getCourseModules()`** -- 4 sequential API round-trips (~200-400ms cold) | `services/api/courses.api.ts:331-381` | Merge into a single query with joins or use `Promise.allSettled` for the two parallel pairs |
| P-8 | 🟡 P2 | [M] | **Missing `width`/`height` on images causes CLS** -- most `<img>` tags lack dimensions | `CourseCard.tsx:25`, `Dashboard.tsx`, `HeroCarousel.tsx`, `EnrollmentGate.tsx` | Add explicit `width`/`height` or use `aspect-ratio` CSS with `width: 100%; height: auto` |
| P-9 | 🟡 P2 | [M] | **`select('*')` in 8+ API queries** -- fetches unnecessary columns | `enrollments.api.ts:57`, `admin.api.ts:108,214,740,813`, `progress.api.ts:213` | Replace `select('*')` with explicit column lists; especially for `courses(*)` which pulls all course columns into enrollment queries |
| P-10 | 🟡 P2 | [S] | **All reviews + modules fetched eagerly on course page** -- even when only overview tab shown | `services/api/courses.api.ts:237-309` | Split into separate queries; fetch reviews only when user clicks "Reviews" tab |
| P-11 | 🟡 P2 | [S] | **Duplicate `useEffect` fire on same deps** -- effects 1+2 both fire on `[user, courseId]` | `hooks/useModuleProgress.ts:82-118` | Merge both effects into a single `useEffect` with internal sequencing |
| P-12 | 🟢 P3 | [S] | **Lighthouse perf threshold at "warn" 0.8** -- CI passes with poor performance | `.lighthouserc.json` | Change to `"error"` at 0.9 |
| P-13 | 🟢 P3 | [S] | **448KB shared async chunk on lazy route navigation** | `vite.config.ts`, `dist/index.html` | Audit chunk splitting; ensure heavy deps (jspdf, html2canvas) are in their own chunk |
| P-14 | 🟢 P3 | [S] | **99KB CSS contains potentially unused Tailwind utilities** | `index.css` | Run `npx @tailwindcss/upgrade` or use `purge` to remove unused utilities |
| P-15 | 🟢 P3 | [M] | **No `srcSet` or `<picture>` for responsive images** | `CourseCard.tsx`, `Dashboard.tsx` | Add `srcSet` with 1x/2x variants for course thumbnails; use `<picture>` where format switching helps |
| P-16 | 🟢 P3 | [S] | **`last_login_at` updated on every page load** | `context/AuthContext.tsx:50-53` | Debounce to once per session or move to `requestIdleCallback` |

### 3.5 Documentation

**Summary:** 12 gaps (0 P0 / 0 P1 / 2 P2 / 10 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| D-1 | 🟡 P2 | [M] | **Documentation severely stale** -- DATABASE_SCHEMA.md says "Migration count: 21" (actual: 28), "Next: 013" (actual: 029), last updated March 14 (2+ months) | `docs/architecture/DATABASE_SCHEMA.md`, `docs/project/KNOWN_ISSUES.md`, `docs/api/SERVICE_MODULES.md`, `docs/guides/DEPLOYMENT.md`, `docs/REGISTRY.md` | Run `/update-doc` for each stale file; update migration counts and dates |
| D-2 | 🟡 P2 | [S] | **CLAUDE.md inaccuracies** -- says 27 migrations (actual: 28), "Next: 028" (actual: 029), missing Courses page, 2 hooks, 9 components | `CLAUDE.md` | Update migration counts and catalog to reflect current state |
| D-3 | 🟢 P3 | [S] | **No CHANGELOG.md** -- `/changelog` skill exists but never run | `CHANGELOG.md` (new) | Run `/changelog` to generate from git history |
| D-4 | 🟢 P3 | [L] | **No Storybook stories** -- zero `.stories.*` files | New `.storybook/` + stories | Run `/generate-storybook-stories` for top-10 components |
| D-5 | 🟢 P3 | [S] | **No Edge Functions README** | `supabase/functions/README.md` (new) | Document conventions: folder structure, shared helpers, auth patterns, error format |
| D-6 | 🟢 P3 | [S] | **`useVideoUrl.ts` JSDoc stale** -- describes old two-phase URL strategy | `hooks/useVideoUrl.ts:17-46` | Update JSDoc to reflect current path-based token + immediate signed URL approach |
| D-7 | 🟢 P3 | [M] | **No video pipeline reference doc** -- details scattered across 5 different docs | `docs/architecture/VIDEO_PIPELINE.md` (new) | Consolidate video architecture from CLAUDE.md, SYSTEM_OVERVIEW.md, and HOOKS.md |
| D-8 | 🟢 P3 | [M] | **No payment reconciliation runbook** | `docs/operations/PAYMENT_RECONCILIATION.md` (new) | Document: how to match Razorpay dashboard to local DB, handle failed webhooks, manual enrollment procedure |
| D-9 | 🟢 P3 | [S] | **`.env.example` missing PostHog vars** -- `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` not documented; references non-existent `VITE_GA_MEASUREMENT_ID` | `.env.example` | Add PostHog vars; remove stale `VITE_GA_MEASUREMENT_ID` |
| D-10 | 🟢 P3 | [S] | **No ADR for HashRouter vs BrowserRouter decision** | `docs/adr/` (new) | Decision still pending; write ADR once resolved |
| D-11 | 🟢 P3 | [S] | **`ROADMAP.md` referenced by `REGISTRY.md` not created** | `docs/project/ROADMAP.md` (new) | Create roadmap from launch checklist + this gap analysis |
| D-12 | 🟢 P3 | [S] | **`SUPABASE_SETUP.md` likely out of date** -- references to old project state | `SUPABASE_SETUP.md` | Review and update for current project state |

### 3.6 DevOps

**Summary:** 12 gaps (2 P0 / 4 P1 / 1 P2 / 5 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| O-1 | 🔴 P0 | [M] | **No automated database backups** -- zero backup schedule, rotation, off-site storage, or restore testing | `supabase/config.toml`, new backup infra | Set up `pg_dump` cron job via `pg_cron`; store in Supabase Storage + external S3-compatible bucket; test restore monthly |
| O-2 | 🔴 P0 | [M] | **No rate limiting on any Edge Function** (also listed under Security S-3) | All 11 `supabase/functions/*/index.ts` | Same recommendation as S-3 |
| O-3 | 🟠 P1 | [M] | **No monitoring/alerting** -- no uptime monitoring, alert thresholds, or synthetic transactions | New monitoring infrastructure | Set up Supabase Log Drains + external monitoring (e.g., Better Uptime, Sentry alerts); create synthetic check for checkout flow and video delivery |
| O-4 | 🟠 P1 | [S] | **Sentry DSN unset; no Edge Function error tracking** (also listed under Security S-11) | `index.tsx`, `.env.example`, all 11 Edge Functions | Same recommendation as S-11 |
| O-5 | 🟠 P1 | [M] | **No CI/CD deployment pipeline** -- CI validates only; all deployments manual | `.github/workflows/ci.yml` | Add deploy jobs to CI: auto-deploy to dev on main push; manual approval gate for prod deploy |
| O-6 | 🟠 P1 | [S] | **No pre-commit hooks** -- no Husky, lint-staged, or git hooks | `package.json` | Add Husky + lint-staged: run `eslint --fix` + `prettier --write` on staged files |
| O-7 | 🟡 P2 | [M] | **No structured logging** -- Edge Functions use ad-hoc `console.error`/`console.log` | All 11 Edge Functions | Add `_shared/logger.ts` with JSON-formatted output, log levels, correlation IDs |
| O-8 | 🟢 P3 | [L] | **Staging shares Supabase instance with production** -- `eyebucks-dev` CF Pages uses same Supabase project | New Supabase project for staging | Create separate Supabase project for staging; migrate schema; update env vars in CF Pages dev project |
| O-9 | 🟢 P3 | [S] | **Database connection pooling disabled** -- `supabase/config.toml` has `[db.pooler] enabled = false` | `supabase/config.toml`, `services/supabase.ts` | Enable pooler; set pool size to 10; configure `services/supabase.ts` to use pooled connection string for non-auth queries |
| O-10 | 🟢 P3 | [S] | **Stale `switch-mode.sh`** -- legacy artifact from Express/Prisma era | `switch-mode.sh` | Delete the file |
| O-11 | 🟢 P3 | [S] | **No INFRASTRUCTURE.md** -- no inventory of services, access patterns, dependencies | `docs/operations/INFRASTRUCTURE.md` (new) | Create: list all services, URLs, access methods, who has credentials |
| O-12 | 🟢 P3 | [S] | **`.gitignore` missing dev clutter entries** -- `screenshot-1.png`, `courses-page.md`, `storefront-output.md`, `switch-mode.sh` | `.gitignore` | Add patterns for generated/dev artifacts |

### 3.7 Accessibility (A11y)

**Summary:** 11 gaps (0 P0 / 7 P1 / 2 P2 / 2 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| A-1 | 🟠 P1 | [S] | **Heading hierarchy violations on 9+ pages** -- missing h1 or skipping levels | `pages/Checkout.tsx`, `pages/Learn.tsx`, `pages/Dashboard.tsx`, `pages/Contact.tsx`, 7 admin pages | Audit heading structure on each page; ensure exactly one `<h1>`, sequential levels without skipping |
| A-2 | 🟠 P1 | [S] | **Focus traps missing on 4 modals/overlays** -- tab cycles to elements behind overlay; no Escape key | `PhoneGateModal.tsx:34-93`, `AdminModal.tsx:22-32`, `CertificateView.tsx:53`, `Layout.tsx:156-241` | Implement `useFocusTrap` hook: on mount, focus first focusable element; on Tab/Shift+Tab, cycle within overlay; on Escape, close |
| A-3 | 🟠 P1 | [S] | **Color contrast fails WCAG AA in light mode** -- `--text-2: #64748b` on `--page-bg: #f1f4f8` = ~4.2:1 (needs 4.5:1); `--text-3: #6b7280` = ~3.9:1 | `index.css` | Darken `--text-2` to `#4b5563` (5.0:1) and `--text-3` to `#4b5563` or lighten `--page-bg` to `#f8fafc` |
| A-4 | 🟠 P1 | [M] | **Video missing captions/subtitles** -- no `<track>` elements, no WebVTT, no transcript | `components/VideoPlayer.tsx:425-449` | Add `<track>` support to VideoPlayer; implement transcript panel; consider Bunny.net auto-caption integration |
| A-5 | 🟠 P1 | [S] | **`aria-describedby` missing on Input error/hint messages** -- screen readers dont announce validation errors | `components/Input.tsx:43-68` | Add `id` to error/hint elements; set `aria-describedby` on `<input>` referencing those IDs |
| A-6 | 🟠 P1 | [M] | **`prefers-reduced-motion` entirely absent** -- 11 CSS animations run unconditionally | `index.css`, new hook needed | Add `@media (prefers-reduced-motion: reduce)` to disable all animations; wrap carousel auto-advance in `usePrefersReducedMotion` hook |
| A-7 | 🟠 P1 | [S] | **Form error messages lack `role="alert"`** -- errors appear visually but not announced | `ReviewForm.tsx:104-108`, `PhoneGateModal.tsx:65-70`, `Checkout.tsx:399-408`, `ClosingSection.tsx:169` | Add `role="alert"` to all error message containers |
| A-8 | 🟡 P2 | [S] | **StarRating missing `role="radiogroup"`** -- each star is a button without radiogroup semantics | `components/StarRating.tsx:41-91` | Add `role="radiogroup"` to container; `role="radio"` + `aria-checked` to each star; `aria-label="N stars"` |
| A-9 | 🟡 P2 | [S] | **DataTable sortable column headers not keyboard accessible** -- `<th>` with `onClick` but no `tabIndex`/`role`/keyboard handler | `pages/admin/components/DataTable.tsx:103-116` | Add `tabIndex={0}`, `role="button"`, `aria-sort`, `onKeyDown` (Enter/Space to sort) |
| A-10 | 🟢 P3 | [S] | **Skip-to-content link missing** -- no bypass block for keyboard users | `components/Layout.tsx` | Add visually-hidden "Skip to main content" link as first focusable element |
| A-11 | 🟢 P3 | [S] | **Toast notifications lack `role="status"` or `aria-live`** -- dynamically added content not announced | `components/Toast.tsx` | Add `role="status"` and `aria-live="polite"` to toast container |

### 3.8 Code Quality

**Summary:** 15 gaps (1 P0 / 1 P1 / 6 P2 / 7 P3)

| # | Priority | Effort | Gap | Affected Files | Recommendation |
|---|----------|--------|-----|----------------|----------------|
| C-1 | 🔴 P0 | [L] | **TypeScript `strict: true` missing** -- no `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`; 40+ `any` usages | `tsconfig.json`, 30+ catch blocks across admin pages and hooks | Enable `strict` incrementally: start with `strictNullChecks`, fix surfaced errors, then `noImplicitAny`; target full `strict: true` |
| C-2 | 🟠 P1 | [S] | **SettingsPage section constraint mismatch** (also listed under Features F-3) | `pages/admin/SettingsPage.tsx`, `supabase/migrations/013_site_content.sql` | Same recommendation as F-3 |
| C-3 | 🟡 P2 | [M] | **40+ `any` type usages** -- 30 `catch (err: any)` blocks, 4 `as any` assertions | 30 catch blocks, `reviews.api.ts:59,68`, `AuditLogPage.tsx:8` | Replace `err: any` with `err: unknown` + type narrowing; remove `as any` casts by fixing underlying type mismatches |
| C-4 | 🟡 P2 | [M] | **`admin.api.ts` at 890 lines** -- monolithic module mixing courses, users, payments, reviews, certificates | `services/api/admin.api.ts` | Split into `admin/courses.admin.api.ts`, `admin/users.admin.api.ts`, `admin/payments.admin.api.ts`, `admin/reviews.admin.api.ts`, `admin/certificates.admin.api.ts` with shared barrel |
| C-5 | 🟡 P2 | [M] | **Duplicate bundle course fetching (~85 lines)** -- `getCourses()` and `getCourse()` have identical two-step logic | `services/api/courses.api.ts:163-214, 268-306` | Extract `enrichCoursesWithBundles(courses: Course[]): Promise<Course[]>` helper |
| C-6 | 🟡 P2 | [S] | **Duplicate module list rendering (~30 lines x2)** -- mobile drawer and desktop sidebar | `pages/Learn.tsx:605-674` | Extract `ModuleListItem` component used by both |
| C-7 | 🟡 P2 | [S] | **Magic numbers across 7+ files** -- `3000` x5, `0.95` hardcoded, `5000`, `300` | `useModuleProgress.ts:188`, `Checkout.tsx:301`, `PurchaseSuccess.tsx:29`, etc. | Extract to named constants in a shared `constants.ts` file |
| C-8 | 🟡 P2 | [S] | **`prettier` missing from devDependencies** (also listed under Testing T-10) | `package.json` | Same recommendation as T-10 |
| C-9 | 🟢 P3 | [S] | **Missing `.gitignore` entries** (also listed under DevOps O-12) | `.gitignore` | Same recommendation as O-12 |
| C-10 | 🟢 P3 | [S] | **`VITE_APP_NAME` and `VITE_APP_URL` unused** -- "Eyebuckz" hardcoded in Helmet titles and Layout JSON-LD | `components/Layout.tsx:53-57`, all page `<Helmet>` titles | Replace hardcoded strings with `import.meta.env.VITE_APP_NAME` and `import.meta.env.VITE_APP_URL` |
| C-11 | 🟢 P3 | [S] | **`import React` in 33+ files** -- unnecessary with React 19 JSX transform | 33 files across `pages/`, `components/` | Remove all `import React from 'react'` statements (JSX transform handles this automatically) |
| C-12 | 🟢 P3 | [S] | **`ThemeContext` not in barrel export** -- imported directly instead of via `context/index.ts` | `context/index.ts`, `components/Layout.tsx:6` | Add `export { ThemeProvider, useTheme } from './ThemeContext'` to `context/index.ts` |
| C-13 | 🟢 P3 | [S] | **`emailTemplates.ts` uses template literals with no HTML escaping** -- potential XSS if user names contain special characters | `supabase/functions/_shared/emailTemplates.ts` | Add HTML entity escaping for all user-supplied values interpolated into email templates |
| C-14 | 🟢 P3 | [S] | **Hardcoded expiry times in Edge Functions** -- `expiresAt = new Date(Date.now() + 365*24*60*60*1000)` magic number | `supabase/functions/checkout-verify/index.ts`, others | Extract to `_shared/constants.ts` as `ENROLLMENT_EXPIRY_MS` |
| C-15 | 🟢 P3 | [S] | **`certificate-generate` Edge Function has no timeout** -- long PDF generation could hang | `supabase/functions/certificate-generate/index.ts` | Add `AbortController` with 30s timeout to PDF generation |

---

## 4. Top 10 Pre-Launch Gaps (Ranked by Impact)

| Rank | Gap | Priority | Effort | Domain(s) |
|------|-----|----------|--------|-----------|
| 1 | **SECURITY DEFINER RPCs allow cross-user IDOR** -- any authenticated user can call `complete_module()`, `get_progress_stats()`, `increment_view_count()` with another user's ID, enabling certificate fraud and progress tampering | 🔴 P0 | [M] | Security |
| 2 | **Aggregate business data leaked to any authenticated user** -- `get_admin_stats()`, `get_sales_data()`, `get_recent_activity()`, `get_course_analytics()` expose revenue, user counts, and sales history to all users | 🔴 P0 | [S] | Security |
| 3 | **No rate limiting on any Edge Function** -- unlimited Razorpay order creation, coupon brute-forcing, signed-URL generation can exhaust resources or leak information | 🔴 P0 | [M] | Security, DevOps |
| 4 | **Progress completion bypass** -- omitting `currentTime`/`duration` parameters skips the 95% watch threshold, allowing any user to earn certificates without watching course content | 🔴 P0 | [S] | Security |
| 5 | **No automated database backups** -- a production system processing payments and issuing certificates has zero backup schedule, rotation, or off-site storage; a data loss event would be catastrophic | 🔴 P0 | [M] | DevOps |
| 6 | **TypeScript `strict: true` missing** -- no `strictNullChecks`, `noImplicitAny`, or `strictFunctionTypes` across 80+ source files; enabling would surface 100+ latent null-pointer bugs that could cause runtime crashes in production | 🔴 P0 | [L] | Code Quality |
| 7 | **Edge Functions completely untested (0%)** -- 11 Edge Functions + 8 shared utilities handle payments, video DRM, certificates, and webhooks with zero test coverage; a regression here means money or security risk | 🟠 P1 | [L] | Testing |
| 8 | **Full-text search is client-side `.includes()` only** -- search operates on max 12 loaded courses with no database-level text indexing; course discovery breaks entirely beyond ~20 courses in the catalog | 🟠 P1 | [M] | Features, Performance |
| 9 | **Bundle pricing broken** -- checkout uses raw `course.price` for bundles, `bundledCourses` hardcode `price: 0`, and there is no savings display; the bundle feature is shipped but produces incorrect charges | 🟠 P1 | [M] | Features |
| 10 | **No monitoring/alerting** -- no uptime monitoring, no alert thresholds, no synthetic transaction monitoring; if checkout or video delivery breaks, no one is notified until users report it | 🟠 P1 | [M] | DevOps |

---

## 5. Effort Summary

### By Priority

| Priority | Count | Total Est. Effort | Description |
|----------|-------|--------------------|-------------|
| 🔴 P0 | 6 | 15-18 days | Critical: security vulnerabilities, data loss risk, systemic code quality |
| 🟠 P1 | 24 | 28-35 days | High: major feature gaps, test coverage holes, a11y violations, missing infra |
| 🟡 P2 | 34 | 40-55 days | Medium: code quality debt, moderate test gaps, stale docs, missing non-core features |
| 🟢 P3 | 28 | 25-30 days | Low: future enhancements, minor optimizations, cosmetic improvements |
| **Total** | **92** | **108-138 days** | Full gap closure (all priorities) |

### By Domain

| Domain | P0 | P1 | P2 | P3 | Total | Est. Effort |
|--------|-----|-----|-----|-----|-------|-------------|
| Security | 4 | 0 | 4 | 4 | 12 | 8-10 days |
| Features | 0 | 3 | 4 | 3 | 10 | 20-28 days |
| Testing | 0 | 3 | 5 | 2 | 10 | 28-36 days |
| Performance | 0 | 6 | 5 | 5 | 16 | 10-14 days |
| Documentation | 0 | 0 | 2 | 10 | 12 | 6-8 days |
| DevOps | 2 | 4 | 1 | 5 | 12 | 12-16 days |
| A11y | 0 | 7 | 2 | 2 | 11 | 8-11 days |
| Code Quality | 1 | 1 | 6 | 7 | 15 | 16-20 days |

---

## 6. Quick Wins (P1/P2, Effort [S] -- Highest ROI)

These items can each be completed in a single sitting (1-4 hours) and deliver disproportionate value relative to their effort. Prioritize these after P0 items are resolved.

| # | Gap | Priority | Effort | Impact |
|---|-----|----------|--------|--------|
| QW-1 | **Aggregate data leak fix** (S-2/P0-2) -- add `is_admin()` gate to 4 RPCs | 🔴 P0 | [S] | Closes revenue/user-count data exposure |
| QW-2 | **Progress completion bypass fix** (S-4/P0-4) -- make `currentTime`/`duration` required | 🔴 P0 | [S] | Closes certificate cheating vector |
| QW-3 | **SettingsPage constraint mismatch** (F-3/C-2) -- add `'settings'` to CHECK constraint or remove from UI | 🟠 P1 | [S] | Prevents DB errors on settings save |
| QW-4 | **21/24 images missing `loading="lazy"`** (P-1) -- one attribute per `<img>` tag | 🟠 P1 | [S] | Reduces initial page load bandwidth by ~30-50% |
| QW-5 | **`jspdf`/`html2canvas` lazy loading** (P-3) -- change to dynamic `import()` | 🟠 P1 | [S] | Removes ~200KB from Profile page initial bundle |
| QW-6 | **Video poster/thumbnail** (P-4) -- fetch Bunny thumbnail before HLS loads | 🟠 P1 | [S] | Eliminates 5-10s black screen on Learn page |
| QW-7 | **Google Fonts render-blocking** (P-5) -- add `media="print" onload` pattern | 🟠 P1 | [S] | Shaves 200-500ms from First Contentful Paint |
| QW-8 | **Heading hierarchy fixes** (A-1) -- add/correct `<h1>` on 9+ pages | 🟠 P1 | [S] | Improves screen reader navigation for all pages |
| QW-9 | **Focus traps on 4 modals** (A-2) -- implement `useFocusTrap` hook | 🟠 P1 | [S] | Makes modals keyboard-accessible |
| QW-10 | **Color contrast fix** (A-3) -- darken `--text-2` and `--text-3` by one shade | 🟠 P1 | [S] | Makes body text WCAG AA compliant across entire app |
| QW-11 | **`aria-describedby` on Input errors** (A-5) -- link error/hint IDs to inputs | 🟠 P1 | [S] | Screen readers announce validation errors on all forms |
| QW-12 | **Form error `role="alert"`** (A-7) -- add attribute to 4 error containers | 🟠 P1 | [S] | Error messages announced to screen readers |
| QW-13 | **Pre-commit hooks** (O-6) -- add Husky + lint-staged | 🟠 P1 | [S] | Prevents un-linted code from being committed |
| QW-14 | **Connection pooling** (O-9) -- enable `[db.pooler]` | 🟢 P3 | [S] | Prevents connection exhaustion under concurrent load |
| QW-15 | **Sentry DSN set** (S-11/O-4) -- uncomment + add real DSN | 🟠 P1 | [S] | Frontend errors become visible immediately |
| QW-16 | **Defense-in-depth user_id filters** (S-5) -- add `.eq('user_id', ...)` to 8 API methods | 🟡 P2 | [S] | Protects data if RLS is accidentally disabled |
| QW-17 | **Webhook replay protection** (S-6/S-7) -- store + dedupe on `X-Razorpay-Event-Id` | 🟡 P2 | [S] | Prevents duplicate payments/notifications on webhook retry |
| QW-18 | **Magic numbers extraction** (C-7) -- create `constants.ts` with named exports | 🟡 P2 | [S] | Makes thresholds findable and changeable in one place |
| QW-19 | **Remove `import React`** (C-11) -- delete from 33 files | 🟢 P3 | [S] | Cleaner code, smaller bundle (tree-shaking) |
| QW-20 | **`.env.example` fix** (D-9) -- add PostHog vars, remove stale GA var | 🟢 P3 | [S] | New developers can set up env correctly |
| QW-21 | **`escapeOrFilter` period escaping** (S-10) -- add `.` to regex | 🟢 P3 | [S] | Closes potential PostgREST filter injection |
| QW-22 | **`search_path` hardening** (S-9) -- add `SET search_path = ''` to 17 functions | 🟢 P3 | [S] | Closes privilege escalation vector in SECURITY DEFINER functions |
| QW-23 | **CLAUDE.md updates** (D-2) -- fix migration counts and catalog | 🟡 P2 | [S] | Keeps Claude Code automation accurate |
| QW-24 | **Duplicate module list extraction** (C-6) -- extract `ModuleListItem` component | 🟡 P2 | [S] | Eliminates 30-line duplication in Learn.tsx |

---

## Appendix A: Audit Methodology

This report synthesizes findings from 8 independent parallel audits conducted on the Eyebuckz LMS codebase:

1. **Features Audit** -- Cataloged every user-facing feature against standard LMS requirements; identified 10 gaps in quizzes, instructor roles, categories, drip content, and i18n.
2. **Testing Audit** -- Analyzed `src/__tests__/` coverage, Vitest config, E2E flows, and Edge Function test absence; counted 39% component coverage and 0% Edge Function coverage.
3. **Security Audit** -- Reviewed all 27 migrations for RLS policies, SECURITY DEFINER functions, input validation, and Edge Function auth; identified IDOR vectors, data leaks, and missing rate limiting.
4. **Performance Audit** -- Analyzed bundle size, image loading patterns, render optimization (`React.memo` usage), lazy loading, font loading, and CSS delivery.
5. **Documentation Audit** -- Cross-referenced all docs in `docs/` against current codebase state; found migration counts, dates, and component catalogs stale across 5+ files.
6. **DevOps Audit** -- Reviewed CI/CD pipeline, backup strategy, monitoring, logging, pre-commit hooks, and environment parity between staging and production.
7. **Accessibility (A11y) Audit** -- WCAG 2.1 AA heuristic audit covering headings, focus management, color contrast, captions, ARIA attributes, reduced motion, and keyboard navigation.
8. **Code Quality Audit** -- Analyzed TypeScript strictness, `any` usage, code duplication, magic numbers, barrel exports, and adherence to project conventions.

Each audit produced a raw findings list. Findings were then deduplicated across audits, assigned canonical priorities (P0-P3), and cross-referenced against the codebase for precise file locations.

## Appendix B: Effort Scale Reference

| Badge | Meaning | Typical Duration |
|-------|---------|------------------|
| [S] | Small | 1-4 hours (single sitting) |
| [M] | Medium | 1-3 days |
| [L] | Large | 3-7 days |
| [XL] | Extra Large | 1-3 weeks |

---

*Report generated 2026-05-29. Next review: after P0 items are resolved, or at minimum before first production deployment.*
