# Deep Project Review — 2026-04-19

**Reviewer:** Claude (Opus 4.7) — automated pre-launch deep review
**Scope:** Full pre-launch readiness across code, security, performance, tests, a11y, docs
**Inclusive of:** 32 uncommitted in-flight changes + last commit `b0c6d23`

---

## Executive Summary

| Verdict | **Conditional No-Go** |
|---|---|
| Launch readiness | **Conditional** — payment-injection hit, lint failure, and abysmal Lighthouse scores must be fixed before going live |
| Critical findings | **3** |
| High | **6** |
| Medium | **8** |
| Low | **5** |

The codebase is fundamentally well-structured: RLS is consistently applied, Edge Functions all use `verifyAuth`, the webhook is HMAC + timing-safe, type-check is clean, all 566 tests pass. But the team has shipped a lot of feature surface (PWA, new components, admin tests) without re-running the launch gate — Lighthouse against the latest build fails every metric, and one new payment-related search query regressed past the established sanitizer pattern. None of the findings are deep architectural debt; the punch list below is concrete and addressable.

### Severity rubric

- **Critical** — security exploit, data loss, payment bypass, or hard launch blocker
- **High** — degraded UX, untested critical path, broken external integration
- **Medium** — refactor candidate, doc drift, perf opportunity, design-system violation
- **Low** — nits, future-improvement seeds

### Pre-flight baseline (Finding #0)

| Check | Status | Note |
|---|---|---|
| `npm run type-check` | ✅ pass | zero errors |
| `npm test -- --run` | ✅ pass | 72 files, 566 tests |
| `npm run build` | ✅ pass (19.14s) | bundle warnings — see [P1] |
| `npm run lint` | ❌ **FAIL** | 2 errors, 331 warnings (`--max-warnings 320`) — see [H3] |
| `npm run test:coverage` | ✅ pass | gaps — see [H2], [H4] |

`lint` is the only failing pre-flight. Treat as Finding #0; it gates `/pre-commit` and `/promote-to-prod` skills today.

---

## CRITICAL

### [C1] Unsanitized PostgREST `.or()` filter in admin payments search

- **File:** `services/api/payments.api.ts:113-116` (`getAdminPayments`)
- **Impact:** PostgREST filter injection — special chars (`,`, `(`, `)`, `"`, `'`, `\`) in `params.search` can break out of the `.ilike()` filter and re-shape the OR predicate. RLS limits blast radius to admin-readable rows (`payments_admin_all`), but it violates the established sanitizer pattern at `admin.api.ts:101-102`, `:735-737`, `:807` — and the search field is reachable from the admin UI.
- **Fix:** Wrap input through `escapeOrFilter()`. The helper already exists at `admin.api.ts:21`. Either import it or duplicate the 3-line function locally:
  ```ts
  const s = escapeOrFilter(params.search);
  query = query.or(
    `receipt_number.ilike.%${s}%,razorpay_payment_id.ilike.%${s}%`
  );
  ```
- **KNOWN_ISSUES status:** Item #6 claimed all `.or()` interpolations were sanitized — this one was missed.

### [C2] Lighthouse performance below launch bar on every metric

- **File:** `.lighthouseci/assertion-results.json` (against `vite preview` at `localhost:4000`)
- **Impact:** Every Core Web Vital fails the configured threshold:

  | Metric | Target | Actual | Verdict |
  |---|---|---|---|
  | Performance score | ≥ 0.80 | **0.39** | ❌ 51% below |
  | First Contentful Paint | < 2000ms | **4561ms** | ❌ 128% over |
  | Largest Contentful Paint | < 2500ms | **5485ms** | ❌ 119% over |
  | Total Blocking Time | < 300ms | **2168ms** | ❌ 622% over |

  These are throttled-mobile numbers, but they are run against the production build and reflect what real first-time users will experience. The 616 kB main `index-*.js` chunk and the 175 kB Supabase vendor chunk are loaded on every page (including the landing page) and dominate TBT.
- **Fix:** Three targeted changes will move the needle without architectural rework:
  1. Move `@sentry/react` and `posthog-js` behind `import()`-deferred initialization in `index.tsx` so they don't block first paint.
  2. Split `services/api` into per-domain code-split chunks — currently the whole barrel is in the main bundle even on the landing page.
  3. Defer `<HeroCarousel>` images via `loading="lazy"` and add `width`/`height` attributes to fix CLS on the slides.
- **Verification:** Re-run `Skill: perf-audit`; target Performance ≥ 0.80, LCP < 2500ms.

### [C3] Lint baseline broken — gates `/pre-commit` and `/promote-to-prod`

- **File:** `e2e/fixtures/auth.ts:13`, `:17`
- **Impact:** ESLint flags Playwright fixture functions `authenticatedPage` / `adminPage` as React hook violations because they call Playwright's `use()` API. Both errors are false positives, but they cause `npm run lint` to exit non-zero and block the launch pipeline. Compounded by warning count (331) exceeding the configured `--max-warnings 320`.
- **Fix:** Add `e2e/**` to ESLint's `ignorePatterns` (or to a project-level `.eslintignore`). Then audit the recently-added warnings to bring count back under 320.
- **Why this matters:** Until lint is clean, `/promote-to-prod` cannot run as designed.

---

## HIGH

### [H1] Missing `og-image.png` — broken social share previews

- **File:** `index.html:15`, `:22` reference `https://eyebuckz.com/og-image.png`; `public/og-image.png` does not exist.
- **Impact:** Every link shared on Twitter, LinkedIn, WhatsApp, Slack, etc. will render a broken image card on launch day.
- **Fix:** Add a 1200×630 PNG at `public/og-image.png`. `Skill: generate-course-assets` can produce one via Canva.

### [H2] `VideoPlayer.tsx` and `VideoUploader.tsx` have 0% test coverage

- **Files:** `components/VideoPlayer.tsx` (453 LOC), `components/VideoUploader.tsx` (398 LOC)
- **Impact:** Coverage report does not include these files at all — they have no tests. `VideoPlayer` is the most complex component in the codebase (HLS.js state machine, error recovery, quality switching, PiP, error overlay) and was the source of the four-bug video outage last month (KNOWN_ISSUES #6b). `VideoUploader` is the only path admins use to add new course content. Both are launch-critical and zero-tested.
- **Fix:** Add at minimum:
  - `VideoPlayer`: render with `videoId`, mock HLS.js, assert play/pause/quality menu/PiP toggles call the imperative handle correctly; assert error overlay appears on `onError` and clears on `handleLevelsLoaded` (regression guard for KNOWN_ISSUES #6b items 5–6).
  - `VideoUploader`: render, mock the TUS client, assert progress callback updates UI, assert size-limit rejection.
  - Use `Skill: run-tests` to scaffold.

### [H3] AuthContext only 2.5% covered

- **File:** `context/AuthContext.tsx`
- **Impact:** The hardest part of the app (Google OAuth callback, `session-enforce` Edge Function call, exponential profile-load retry) is essentially un-exercised by tests. Bugs here look like login failures and are very hard to diagnose without unit-level guards.
- **Fix:** Add a test file mocking `supabase.auth` events (`SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`) and assert state transitions and the retry schedule.

### [H4] E2E suite is smoke-only — does not exercise payment

- **File:** `e2e/checkout.spec.ts`
- **Impact:** The checkout spec checks that unauthenticated users redirect to login and that the page loads — it does not click "Buy", does not mock Razorpay, does not assert enrollment is created. Same shape across `enrollment.spec.ts`. The most expensive code path in the product is verified by no end-to-end test.
- **Fix:** Stub Razorpay's `window.Razorpay` constructor to immediately invoke the success handler with a fake signature, then call `Skill: rls-test` style setup so the verify Edge Function (or a mocked one) creates a real enrollment row, then assert redirect to `/success`.

### [H5] Lighthouse already shows >500 kB chunk warnings — bundle bloat is real

- **Build output:** `dist/assets/index-*.js` = **616.72 kB (163.93 kB gzipped)**, plus the always-loaded Supabase vendor chunk = 175.91 kB (46.16 kB gzipped). Vite explicitly warns at the end of `npm run build`.
- **Impact:** Drives [C2] but is also a standalone signal. The Supabase JS SDK is loaded on the landing page even though anonymous browsing of `/` uses no auth-bearing queries.
- **Fix:** The lazy-loaded vendor chunks are configured (HLS, recharts) — extend the same pattern: lazy-init Supabase client only on routes that need it, or split `services/api` into per-domain chunks. Combine with [C2] fixes.

### [H6] `services/api/index.ts` barrel reports 0% coverage

- **File:** `services/api/index.ts` (`0 | 0 | 0 | 0`)
- **Impact:** Zero functional coverage means no test imports from the barrel — they all dive into individual modules. Could mask circular-import or re-export typos until a runtime crash on the first call.
- **Fix:** Add a one-liner test that imports every named export from the barrel and asserts it's a function/object. Cheap insurance.

---

## MEDIUM

### [M1] HashRouter still blocks SEO indexing of public pages

- **File:** `App.tsx`, `KNOWN_ISSUES.md` item #11 (decision pending)
- **Impact:** Now that the Storefront, CourseDetails, About, Contact, Privacy, Terms, and Login pages are launch-critical, hash-fragment URLs (`/#/course/x`) will not be crawled by Google. If discovery is paid-only, this is fine; if SEO matters, switch to `BrowserRouter` and add Cloudflare Pages `_redirects` (`/* /index.html 200`).
- **Fix:** Resolve the decision in the `docs/adr/` HashRouter ADR.

### [M2] Service worker has no version-bumping strategy

- **File:** `public/sw.js`
- **Impact:** `CACHE_NAME = 'eyebuckz-v1'` is hardcoded. After deploys, returning users will continue to receive the old `index.html` from cache (the SW serves cached-first for same-origin) until they manually hard-reload. Could create user-visible drift between client and Edge Function changes.
- **Fix:** Replace `'eyebuckz-v1'` with a build-time-injected hash (Vite plugin) — or have the SW always fetch `index.html` network-first.

### [M3] Monolithic page components (≥ 500 LOC)

- `pages/Learn.tsx` (703 LOC), `pages/Storefront.tsx` (607 LOC), `pages/Checkout.tsx` (570 LOC), `pages/CourseDetails.tsx` (457 LOC)
- **Impact:** All four are also the lowest-coverage pages (Learn 52%, Checkout 44%, Storefront 65%). Hard to test, hard to refactor, hard to find logic. Not a launch blocker but a sustained-velocity tax.
- **Fix:** Extract sub-components per visual region (e.g., `LearnVideoPanel`, `LearnModuleNav`, `LearnNotesDrawer`). Move pure logic (filter/sort) into hooks.

### [M4] Server-state caching gap (TanStack Query not started)

- **Files:** all page components
- **Impact:** Every navigation triggers full re-fetch + spinner. Acknowledged in KNOWN_ISSUES #8. Real impact appears once 2+ users are concurrently on the same course detail page hitting the same `getCourse` call.
- **Fix:** Adopt TanStack Query incrementally. Start with `coursesApi.getCourses` and `enrollmentsApi.getMyEnrollments` (highest read frequency, lowest write frequency). Effort: ~1 day for the wrapper, +1 day per migrated query.

### [M5] Design-system violations: hardcoded colors in new components

- **Files:** `components/CreatorsSection.tsx` (whole file uses `bg-neutral-900`, `bg-white/5`, `text-white`), `components/HeroCarousel.tsx:53` (`bg-neutral-900 border border-neutral-800`)
- **Impact:** These two new components hardcode dark-theme colors instead of using `t-bg`, `t-card`, `t-text` token utilities. They render the same in light and dark modes — defeats the theme system and creates a jarring contrast on light pages.
- **Fix:** Replace `bg-neutral-900` → `t-bg-alt`, `bg-white/5` → `t-card`, `text-white` → `t-text`, etc. Cross-reference `index.css` `@theme` block.

### [M6] Stale JSDoc in `VideoPlayer.tsx`

- **File:** `components/VideoPlayer.tsx:24-25`, `:33-35`
- **Impact:** JSDoc states "the CDN URL (`fallbackUrl`) is served immediately while the signed URL is fetched in the background" — but per KNOWN_ISSUES #6b, this Phase-1 pre-serve was removed in March 2026 because unsigned URLs return 403 with token auth enabled. New maintainers will be misled.
- **Fix:** Replace the docstring with the actual behavior (signed URL is fetched first; CDN URL is fallback only if Edge Function fails).

### [M7] Lighthouse run baseline is local — no production CI gate

- **Files:** `.lighthouseci/links.json`, `.lighthouseci/assertion-results.json`
- **Impact:** Lighthouse is run manually against `localhost:4000`. There is no scheduled or PR-gated check against `dev.eyebuckz.com` or production. Without this, [C2] regressions will silently land.
- **Fix:** Add `Skill: github-actions-claude` workflow that runs `Skill: perf-audit` on PRs and posts the score as a check.

### [M8] HMAC `timingSafeEqual` falls through on length mismatch

- **File:** `supabase/functions/_shared/hmac.ts:22-32`
- **Impact:** If the attacker-supplied signature has the wrong length, the function returns `false` immediately — leaking length information through timing. In practice Razorpay signatures are always 64 hex chars so this is mostly theoretical, but a strict-correctness implementation would compare lengths in constant time too.
- **Fix:** When lengths differ, still iterate `aBuf.length` bytes XORing against `b[i % b.length]` and finally OR with `1`. Low priority — defense in depth.

---

## LOW

### [L1] `types/supabase.ts` includes dropped `sessions` / `refresh_tokens` tables

- **File:** `types/supabase.ts`, KNOWN_ISSUES #7
- **Impact:** Type definitions reference tables removed during the auth migration. No runtime impact — TypeScript is happy because the types just describe a possible API surface — but autocomplete suggests non-existent tables.
- **Fix:** Run `Skill: gen-db-types` once Docker is available.

### [L2] 38 `: any` / `as any` usages across 20 files

- **Impact:** Most are pragmatic (`catch (err: any)`). One worth fixing: `pages/admin/CoursesPage.tsx:50` has `let aVal: any, bVal: any` in a sort comparator that could be typed as `string | number`.
- **Fix:** Optional clean-up; not a launch blocker.

### [L3] `utils/adminErrors.ts` only 16.7% covered

- **File:** `utils/adminErrors.ts`
- **Impact:** Error formatter helper is reached only on error paths. Low risk but could mask a bad path in prod.
- **Fix:** Add a unit test calling each export with each known Supabase/Edge error shape.

### [L4] `vendor-posthog` produces an empty chunk on build

- **Build output:** `dist/assets/vendor-posthog-*.js  0.00 kB`
- **Impact:** Vite emits an empty chunk. Suggests `posthog-js` is in the vendor manualChunks config but not actually imported anywhere it can be split out. Cosmetic but means the tool-chain has a dead config entry.
- **Fix:** Remove `posthog` from the manualChunks list, or actually wire it in via `utils/analytics.ts`.

### [L5] Migration `024_promote_gifton_admin.sql` ships a hardcoded admin email

- **File:** `supabase/migrations/024_promote_gifton_admin.sql`
- **Impact:** Migration disables the `prevent_role_change` trigger, promotes `giftontombiju@gmail.com` to ADMIN, re-enables. Re-enabling is correct (verified). But this migration is permanent in version control — every fresh DB reset will promote that account. Acceptable for the project's solo-dev stage but worth noting before any handover.
- **Fix:** None required pre-launch. Document the implicit ADMIN account in `docs/operations/ADMIN_RUNBOOK.md`.

---

## Strengths Observed

- **Edge Function auth is uniformly enforced.** All 10 protected functions use `verifyAuth()` from `_shared/auth.ts`. The one exception (`checkout-webhook`) is correctly HMAC-verified with a timing-safe comparison and is documented as "never add JWT verification to this function."
- **`video-signed-url` Edge Function is well-designed.** Verifies enrollment + free-preview + admin in correct precedence; performs real-time expiry check (not just relying on pg_cron); validates that the requested videoId belongs to the requested moduleId — preventing horizontal access through a sibling module's GUID.
- **RLS is comprehensive.** Migration 003 enables RLS on every table; migration 008 closed the original `users_select USING (true)` PII leak before this review caught it; migration 022 added a BEFORE-UPDATE trigger that blocks role self-promotion regardless of policy state.
- **Webhook is idempotent.** `checkout-webhook` uses `upsert` with `onConflict + ignoreDuplicates`, so duplicate Razorpay webhook deliveries cannot create double enrollments or double payment rows.
- **Test count and quality are high outside the gaps above.** 566 unit tests across 72 files, with the admin section fully covered (12/12 admin pages have unit tests). All 22 untracked test files run green.
- **No `dangerouslySetInnerHTML` and no `@ts-ignore`.** XSS surface is empty, type-suppression debt is zero.
- **No `useEffect` without dep arrays.** All 65+ effect hooks have explicit deps — no infinite-render footguns.

---

## Recommendations Prioritized

**Before launch (must-fix):**
1. [C1] Sanitize `payments.api.ts:113` `.or()` filter — 5 minutes
2. [C2] Drop bundle weight; re-run Lighthouse to ≥ 0.80 — half day
3. [C3] Exclude `e2e/` from ESLint, drop warning count under 320 — 30 minutes
4. [H1] Add `public/og-image.png` — 15 minutes
5. [H2] Cover `VideoPlayer` + `VideoUploader` regressions for KNOWN_ISSUES #6b — half day

**Before next sprint (should-fix):**
6. [H3] AuthContext tests — half day
7. [H4] Real E2E for checkout flow — 1 day
8. [M1] Decide HashRouter vs BrowserRouter — meeting + ~1 hour
9. [M2] Service-worker version bumping — 1 hour
10. [M5] Fix design-system violations in CreatorsSection / HeroCarousel — 1 hour
11. [M7] Lighthouse on PRs via GitHub Actions — half day

**Eventually (nice-to-have):**
- [M3] Split monolithic pages
- [M4] TanStack Query
- [M6] VideoPlayer JSDoc
- [L1]–[L5] cleanup pass

---

## Out-of-scope / Deferred

- Did not run a live `Skill: rls-test` — would require local Supabase. RLS was reviewed via migration files only. Recommend one full-matrix run against `dev.eyebuckz.com` before launch.
- Did not run `Skill: audit-a11y` against live URLs — covered indirectly by the `@axe-core/playwright` dep being installed and by the `MobileBottomNav`/touch-target work in flight. Recommend a focused pass on Storefront + CourseDetails + Checkout once [M5] is fixed.
- Did not deep-review `pages/admin/CourseEditorPage.tsx` (43.6 kB chunk, largest admin page) — admin tooling is internal so it is lower priority than user-facing flows. Worth a follow-up review if admin UX issues arise.
- Did not assess the new PostHog/Sentry instrumentation density — observability is a separate audit.

---

*Generated by Claude Opus 4.7 deep review on 2026-04-19. Report is read-only — no code changes were made during the review.*
