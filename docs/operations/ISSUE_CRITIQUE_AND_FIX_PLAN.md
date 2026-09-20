# Issue Critique & Fix Plan — September 2026

> Produced by an adversarial multi-agent audit (26 previously-reported issues, each independently
> critiqued and then attacked by a skeptic to construct a concrete failure case), plus a completeness
> pass and live database verification.

## Already actioned from this audit (committed + applied to production)

- **[SEC] `search_path` hardening completed (migration 055).** 054 pinned `SET search_path = public`,
  which leaves `pg_temp` implicitly first (still shadowable). Re-pinned all six SECURITY DEFINER
  functions as `public, pg_temp` (project idiom). Verified live.
- **[SEC] Digital-asset private-column leak closed (migration 056).** `digital_assets_select` exposed
  every PUBLISHED row to role `public`, and anon held column SELECT on `storage_path` (R2 key) and
  `external_url` (bearer link to the paid file). Revoked the table grant, re-granted the 18 safe
  columns; `external_url` kept for `authenticated` (admin editor). Verified live. Residual: a
  logged-in non-admin can still read `external_url` — needs the admin read routed through
  service_role (see plan item).

### Round-2 code fixes (committed `f48bc33`, deployed to **dev**; each with a non-vacuous test)

| id | fix | test |
|----|-----|------|
| en-catalog | fallback fires under search/filters + "showing all languages" notice + `getCourseCount` fallback | coursesApi (4) |
| breadcrumb | dynamic label before UUID guard (UUID courses show titles); `/course` crumb non-linking; Home link | Breadcrumbs (5, caught a Home regression) |
| asset-badges | 3rd badge derived from `asset.license` (no false "Commercial-Ready") | TrustBadges (4) |
| banner-contrast | resolve `var()` bg, WCAG AA 4.5:1, max-contrast pivot | AnnouncementBanner (+2) |
| opportunity-cards | desktop grid columns capped to item count (centres 3 cards) | — |
| ticker | marquee 40s → 25s (restores original speed) | — |
| course-includes | empty list respected (null-only fallback) | — |
| cms-revert / cms-pageorder | admin read deterministically ordered; badge marks first ACTIVE row | ContentPage (+1) |
| cms-stats | stat-list seeds 4 editable rows + numeric coercion on save | ContentPage (+1) |
| bundle-value | urgencyTag pill + savings surfaced in the desktop sidebar | — |

**Deferred pending owner decision:** `pricing` storefront (real `compare_price` vs plain CMS text vs
"Starting at"); the `external_url` authenticated-read hardening (needs a service_role admin path);
footer bottom-bar copy into CMS; a11y pass. The prod frontend deploy remains gated.

---

# Eyebuckz Fix Audit — Critique, Test Verification & Fix Plan

Read-only review of the 25 tracked issues plus a completeness pass. Ground truth: worktree branch `integration/aug-fixes` @ `9bb8485`, PR #5, 900/900 tests passing, HEAD deployed to **dev.eyebuckz.com only — NOT production**. DB migrations 046–054 applied + verified in the shared prod DB this session.

**Overarching finding:** none of the frontend fixes are live on `eyebuckz.com`. Every user who filed a report against production still sees the original bug until a gated prod deploy happens. This single fact downgrades ~18 "fixed" issues to "fixed on dev, unresolved for the reporter."

---

## 1. Verdict per issue

Status reconciles critique + adversarial verify: a real skeptic failure case ⇒ **not** SOLID.

| id | title | status | test coverage |
|----|-------|--------|---------------|
| mobile-menu | Mobile menu centre gap / scrolls as separate section | ✅ RESOLVED | GOOD (non-vacuous) |
| sec-paywall | Enrollment UPDATE paywall bypass | ✅ RESOLVED | MISSING |
| dark-pricebar | Dark sticky price bar transparent on nav swipe | ✅ RESOLVED (dev) | MISSING |
| asset-drive | Asset delivery via Google Drive / external link | 🟩 MOSTLY (latent R2 gap) | WEAK (source-string) |
| banner-empty | Announcement section = empty space | 🟨 PARTIAL (CSS-var bypass) | GOOD |
| en-catalog | English catalog empty | 🟨 PARTIAL (search re-empties) | GOOD |
| about-paste | About Us can't paste body content | 🟨 PARTIAL (deploy + data-loss) | GOOD |
| course-includes | "This course includes" not editable | 🟨 PARTIAL (deploy + clear-all footgun) | MISSING |
| footer-shift | Footer shift / Enroll Now overlap | 🟨 PARTIAL (growth CLS + EN gap) | GOOD |
| bundle-value | Bundle total value + savings pop + limited tag | 🟨 PARTIAL (desktop-invisible, no countdown) | GOOD |
| banner-contrast | Banner invisible strip (text≈bg) | 🟨 PARTIAL (default-bg + mid-tone pivot) | GOOD |
| price-mrp | Show both actual + offer price | 🟨 PARTIAL (storefront fabricates MRP) | GOOD (per-product only) |
| cms-revert | CMS edits revert (Discord→WhatsApp) | 🟨 PARTIAL (4th unfixed admin path) | WEAK (source-string) |
| cms-pageorder | CMS list all sections in page order | 🟨 PARTIAL (Live badge wrong row) | WEAK |
| cms-stats | Can't edit stats numbers | 🟨 PARTIAL (empty on create) | VACUOUS |
| footer-cms | Footer content not CMS-editable | 🟨 PARTIAL (bottom bar hardcoded) | WEAK |
| catalog-editable | Catalog/Contact/Assets copy not editable | 🟨 PARTIAL (bulk strings still hardcoded) | WEAK |
| pricing-plain | Pricing plain text, not product-linked | 🟨 PARTIAL (default still product-avg) | MISSING |
| breadcrumb | Breadcrumb shows slug not title | 🟨 PARTIAL (UUID courses still broken) | MISSING |
| asset-badges | Asset checkout shows course trust badges | 🟨 PARTIAL (false "Commercial-Ready") | VACUOUS |
| ticker | Slide ticker clipped/slow/jumps | 🟨 PARTIAL ("slow" regressed ~3×) | VACUOUS |
| flash | Old banner/heading flashes on load | 🟨 PARTIAL (stale-then-swap remains) | GOOD |
| sec-searchpath | SECURITY DEFINER mutable search_path | 🟥 PARTIAL (pg_temp shadow left open) | MISSING |
| catalog-nav | Nav instability on catalog page | 🟥 PARTIAL (unverified, probe still shipping) | MISSING |
| opportunity-cards | "The Opportunity" cards shifted left | 🟥 NOT ADDRESSED (no fix exists) | VACUOUS |

---

## 2. Genuinely resolved

Only where both reviewers agree and no failure case survived:

- **mobile-menu** — root cause fixed (`h-dvh` + `overscroll-contain` + body-scroll-lock); test is non-vacuous (reverting to `h-screen` fails all three assertions). The only clean win.
- **sec-paywall** — `prevent_enrollment_escalation` BEFORE UPDATE trigger (migration 051) is LIVE in prod; verify found no bypass. Caveat: **no automated RLS regression test** — add one, and remember new grant columns aren't auto-guarded.
- **dark-pricebar** — both defects fixed (opaque `bg-[var(--page-bg)]`, translate-clear-nav). No failure case. Caveats: no committed regression test; z-40 bar vs z-50 centre FAB may collide on ~360px; dev-only.

---

## 3. Still needs work

Ordered by severity. Each: what's concretely wrong → the specific fix.

### Security / correctness

**sec-searchpath — pg_temp shadow left open.**
Migration `054:42` pins `SET search_path = public` but drops `pg_temp`, unlike the project's own idiom `public, pg_temp` (`042:29,70,105,135`; `035:85,177,233,252`). Postgres searches an unlisted `pg_temp` **first**, so `is_admin()`'s unqualified `FROM users` (`003:25`) can be shadowed by a session temp table → attacker with any session DDL path (leaked pooler string, future SECURITY INVOKER dynamic SQL) creates `TEMP TABLE users` with their uid as ADMIN and escalates across every RLS policy. Same for `expire_enrollments`, `handle_user_login`, `get_review_summary`. The advisor and the file's own `LIKE 'search_path=%'` check (`054:49-53`) both pass vacuously.
→ **Migration 055**: re-run the six as `SET search_path = public, pg_temp`; prefer folding the SET into the function definitions; extend `verify-migrations.sh` to assert every `prosecdef` public function's search_path ends in `pg_temp`.

**price-mrp / pricing-plain — storefront fabricates prices.** `components/sections/PricingSection.tsx` (the literal price band) ignores real `comparePrice` and invents the struck MRP as `avgModulePrice*1.5` (`:316`) / `avgBundlePrice*2` (`:321`), with a derived fake "SAVE X%" (`:151-156, 211-214`) — even for courses with no real discount. It also runs product-linked averages unconditionally on mount (`:294-326`), so changing any course price shifts the homepage band — the exact coupling the user asked to remove. Per-product displays (CourseCard/CourseDetails/Sidebar) are correct and tested; bundle/related selects omit `compare_price` (`courses.api.ts:384,423`) so MRP never renders there.
→ Feed tiers real `compare_price` or document the MRP as synthetic marketing; default tiers to blank plain-text (true decoupling) or compute `Math.min` bundle price for "Starting at ₹X"; stop the ×1.5/×2 fabrication; add `compare_price` to the two selects. Add a non-vacuous PricingSection test.

**cms-revert — the admin editor reads through a fourth, unfixed query.** The three storefront read paths got `updated_at DESC` tiebreakers, but `pages/admin/ContentPage.tsx:229` loads via `adminApi.getSiteContent()` (`admin.api.ts:809-814`) which orders **only** by `section, order_index ASC` — no tiebreaker, and does **not** filter `is_active`. The Live/Ignored badge (`ContentPage.tsx:520`) is `items[0].id===item.id` over that non-deterministic result, so with prod's 2 tied `community_copy` rows it can mark the wrong (or an inactive) row "Live." Editing that row → storefront `getAllActive` excludes it → the edit "disappears" — the reported symptom, now reproduced *through the diagnostic UI meant to fix it*. Root cause (duplicate singleton rows) is never removed; the storefront fix silently depends on the `set_site_content_updated_at` trigger (`update()` never writes `updated_at`, `siteContent.api.ts:141-156`). Test is source-string `toContain` only.
→ Point `ContentPage` at `siteContentApi.getAll` (or add `updated_at DESC, id ASC` to `getSiteContent`); run the deferred data cleanup + add a partial UNIQUE index for singleton sections; behavioral test (insert tied rows, edit one, assert `getAllActive` returns it first); document the trigger dependency.

**cms-stats — typed editor is empty on create.** `defaultMetaFor('community_copy')` skips `stats` (no `default`, `sectionSchemas.ts:473-478`) → `meta.stats===undefined` → the stat-list field renders only "Not set… Save this row once to start editing" with **zero inputs** (`ContentPage.tsx:79-93`). `buildMetadata` (`:301-317`) has no stat-list branch, so saving never seeds `stats` — the hint is false, fields never unlock. Admin still can't edit numbers except via the JSON escape hatch. Empty numeric input also isn't coerced (`''`→NaN risk in `AnimatedCounter`).
→ Give the stat-list field a `default` (the 4 `COMMUNITY_STATS`) or special-case the empty state to render 4 editable rows; add a `buildMetadata` branch that persists+number-coerces; add add/remove-row affordance; two non-vacuous tests (serialize reaches API; override renders).

### User-blocking / functional

**breadcrumb — every admin-created course still shows no title.** `adminApi.createCourse` (`admin.api.ts:291`) inserts no id → DB `gen_random_uuid()::text`. All links are `/course/<uuid>`. `segmentLabel` hits the UUID regex at `Breadcrumbs.tsx:72` and returns `''` **before** the `dynamicLabels.get` at `:75`, so the title is dropped and `useBreadcrumbLabel` is dead code on that path. Fix only works for legacy seed ids like `c4-editing` — the one case the user happened to report.
→ Move the dynamic-label lookup ahead of the UUID guard; fix/remove the dead `/course` crumb link (`:63,96`); add a Breadcrumbs unit test.

**en-catalog — searching re-empties the catalog.** Fallback (`courses.api.ts:272-274`) only fires when no user filter is active. An EN visitor sees the 3 ML courses, then types a search or clicks a type tab → `!search?.trim()`/`!type` is false → fallback suppressed → "No courses match your search" for a course on screen a second ago. Also masks the real gap (0 EN courses) with unlabelled ML content. `getCourseCount` got no fallback (see §4).
→ Either keep the fallback when a filter is present too, or add a "Showing all languages" notice so toggle+content agree; publish EN content long-term.

**banner-empty / banner-contrast — invisible banner still reproducible.** `parseColor` (`AnnouncementBanner.tsx:23-33`) only handles `#hex`/`rgb()`; a `var(--page-alt)` or named/hsl color returns null and the contrast guard short-circuits (`:59`) returning the requested color untouched. The field's *own placeholder* suggests `var(--page-alt)` (`ContentPage.tsx:167`), so the common admin config (set text color, leave bg default) bypasses the guard → near-black on `#111111` in dark mode = invisible strip. Separately the fixed `0.4` luminance pivot (`:62`) is wrong (break-even ≈0.179): bg `#999999` → picks white at ~2.85:1, below the 3:1 it claims to enforce. Threshold 3:1 is also below WCAG AA (4.5:1) for this ~14px text; `opacity-80` body lowers it further.
→ Replace the pivot with `max(contrast(bg,#111), contrast(bg,#fff))`; raise threshold to 4.5; resolve computed style / extend `parseColor` for named/hsl/var colors; add a mid-tone (`#999999`) and a default-bg test.

**asset-badges — false licensing claim.** `TrustBadges.tsx:25` hardcodes "Commercial-Ready Files"; for a PERSONAL/EXTENDED asset this contradicts `LICENSE_LABEL` on `AssetDetails.tsx:167` — checkout promises commercial rights the buyer doesn't get. Test mocks `TrustBadges` to `() => null` (`AssetCheckout.test.tsx:21`) so it's vacuous.
→ Derive the third badge from `asset.license`; render real `TrustBadges` in a test asserting course badges absent + license correct.

**bundle-value — two of three asks invisible on desktop.** The "You save X" pop (`CourseDetails.tsx:617-624`) and `urgencyTag` pill (`:601-604`) render **only** inside the `lg:hidden` sticky bar (`:590`); the desktop sidebar (`CourseDetailsSidebar.tsx:43`) shows raw price only. Grep confirms one render site each. No countdown/expiry exists anywhere — "Limited time" never expires.
→ Surface savings + tag in the main/desktop price block; implement a real expiry timestamp or rename the tag; test the tag renders from `pricing_copy`.

**footer-shift — new growth CLS + EN section vanishes.** Reported overlap fixed, but `FeaturedCoursesSection` now mounts at 0px and expands on fetch (`:79-81`), pushing the footer down every load. The `[language]` effect (`:34-41`) never resets `isLoading`/clears `courses`, so ML→EN toggle keeps stale section then collapses. All 3 courses are ML → EN visitors silently lose the whole Featured section (`getCourses` filter `courses.api.ts:35`) with no empty state.
→ Reset `isLoading=true`/clear courses at top of the effect; render an intentional empty state or ML fallback for EN; test the language-switch collapse.

**flash — stale-then-swap remains.** Warm-cache synchronous paint is a strong mitigation (test non-vacuous, `SiteContentContext.test.tsx:75-81`). But a returning visitor after an admin edit paints OLD cached heading+banner then swaps 2-3s later (`SiteContentContext.tsx:37-49,81-92`) — verbatim the reported symptom, accepted by the `:17-22` comment. Cold cache / >24h TTL / private mode flash hardcoded defaults. No direct HeroSection test locks the useMemo-not-effect discipline.
→ Optional: inline CMS payload into `index.html` at build/edge, or render a neutral skeleton (not hardcoded copy) while `useSiteSection` is null; add a HeroSection first-render test.

**ticker — "slow on mobile" regressed ~3×.** `git show d00aa2e`: `--animate-marquee` went from `25s` full-track (0→-100%) to `40s` half-track (0→-50%) = ~3× slower, and mobile `gap-8` makes it slower still; single `--animate-marquee` (`index.css:49`), no `sm:` override. Clipping/jump-before-load are genuinely fixed. HeroCarousel effect deps include `loaded`, so any image finishing resets the current timer. No SocialProofTicker test exists; HeroCarousel tests are vacuous w.r.t. the load-gating.
→ Confirm with user whether "slow" meant speed; if so add a shorter `sm:`-scoped duration; add a fake-timer HeroCarousel test + a two-track SocialProofTicker render test.

### CMS completeness / editability

**course-includes** — deploy gap: prod bundle predates the read path + admin sub-form, so the section is uneditable on `eyebuckz.com` today. Code footgun: deleting all rows → `is_active` filter yields `[]` → `CourseDetails.tsx:85` reverts to 5 hardcoded `DEFAULT_INCLUDES` (can't reach empty). → Deploy; keep fallback for null not empty; add CMS-vs-default render tests (none exist).

**about-paste** — deploy gap (prod admin has no About Page section / recovery surface). Migration `050:52-53` rescues only the single longest `footer_links` body (`LIMIT 1`) but `050:55-58` **unconditionally wipes ALL** footer_links bodies — any secondary stranded text is permanently gone (already ran in prod). Reported issue overgeneralized ("all sections" — only 5 `coreBody:false` were affected). Frontend tests non-vacuous. → Deploy; verify via `050:74-76` SELECT that nothing else was lost.

**footer-cms** — bottom bar (`Layout.tsx:366-372`) copyright + a SECOND hardcoded Privacy/Terms pair are not CMS-editable and drift from the editable `footer_links` Support column; JSON-LD `sameAs` socials hardcoded (`:129-132`); blank-title rows render empty `<li>` (`:90`). No render test for grouped columns. → Move/dedupe bottom bar into CMS; guard blank titles; add a footer_links grouping render test.

**catalog-editable** — only headline copy editable; filter pills "All/Bundles/Modules" (`CatalogSection.tsx:222,268`), sort labels (`:30-36`), search placeholder (`:306`), empty/error states (`:391,416-417`), asset FILE_TYPE labels, Contact card titles + Helmet SEO (`Contact.tsx:55-58,77,88`) all hardcoded — "make EVERY data editable" unmet. `CatalogSection.test.tsx` makes no CMS assertions; `AssetsCatalogSection` has no test file. → Decide scope explicitly; add CMS-override tests for both sections.

**cms-pageorder** — same wrong-Live-row root as cms-revert (badge from non-deterministic `getSiteContent`); `about_page/catalog_copy/assets_copy/contact_copy/course_includes` have no anchor (`sectionSchemas.ts:335,358,372,386,420`) so `siteLinkFor` (`:589-592`) emits no working "View on site" link; PAGE_ORDER↔SECTION_SCHEMAS parity untested; single inactive row gets no badge. → Same tiebreaker fix; emit full page routes for anchorless sections; add badge + page-order parity tests (current "Hero before Pricing" passes under old grouping — vacuous).

**asset-drive** (mostly solid) — latent: `getR2()` null-check (`asset-download-url ~78-83`) returns 500 **before** the external-link branch (`~90`), so an external asset would fail if R2 were unconfigured; `createAsset` returns `mapAsset` not `mapAdminAsset` (`digitalAssets.api.ts:319`) dropping `externalUrl`; edge `isExternal` dropped by API mapping (`:269`); no server-side URL validation; Drive `/file/d/…/view` links open a preview page, not a download. → Move R2 check inside non-external branch; fix mapping; add editor guidance on direct-download link form; behavioral test for the mapping + DB CHECK.

### Open bugs

**opportunity-cards — no fix exists.** `HorizontalGallery.tsx:88-89` renders `md:grid ${desktopGrid}` with no `justify`/`mx-auto`; `FeaturedCoursesSection` (`:91` `lg:grid-cols-4`) puts 3 ML courses in cols 1-3, empty col 4 → left-shift on desktop, fine on mobile (single-card rail `:59`). Same for `ValuePropsSection.tsx:140` (`md:grid-cols-3`). `ValuePropsSection.test.tsx` makes zero layout assertions. → Confirm which section is "The Opportunity" against live CMS, then center at the shared component (`w-fit mx-auto` / `md:justify-center`) or derive column count from item count; add a 3-cards-in-4-col centering test.

**catalog-nav — unverified, no test.** The direct visual-viewport pin (`useVisualViewportInset`, commit `a68d98b`) was **reverted** (`6b5252b`), so `MobileBottomNav` (fixed, bottom:0) still rides the ~40px toolbar-collapse shift on real devices; the opaque bg only masks it. `.viewport-anchor` (`index.css:384-390`) equalizes structure but can't override position:fixed-follows-visual-viewport. `ViewportProbe` is still wired in (`Layout.tsx:377`, "delete once settled") — team signals root cause unconfirmed. `overflow-x:clip` (`:418-420`) correctly fixes the horizontal-pan half but is ignored on iOS 15 Safari. No regression test. → Verify on real iOS+Android with `?vvprobe=1`, then delete the probe; add a `.viewport-anchor` render test; iOS-15 `overflow-x:hidden` fallback or drop support; decide with user whether to reopen the reverted visual-viewport pin.

---

## 4. Newly surfaced / not previously tracked

Ranked; the first is a prod-blocking security hole.

1. **🟥 Digital-asset private columns readable by any client (paywall bypass + R2 key leak).** Same class as the enrollment bypass but **missed entirely**. `digital_assets_select` (migration `039:103-106`) exposes the whole PUBLISHED row; only the app's `STOREFRONT_COLUMNS` list hides `storage_path` (R2 key) and `external_url` (the Google Drive bearer link from migration 048). Anyone with the public anon key can call `supabase.from('digital_assets').select('external_url,storage_path').eq('status','PUBLISHED')` and get every link-delivered asset **for free** + leak R2 object keys. No column GRANT/REVOKE, no security-barrier view anywhere in `supabase/migrations/*.sql`. Migration 048 itself admits "RLS cannot hide columns" yet ships no DB guard. This directly undermines the asset-drive feature marked done. → **Migration**: `REVOKE SELECT (storage_path, external_url) FROM anon, authenticated` (or move to a view / secrets table) + an RLS test asserting anon cannot read them. **Treat as a prod-deploy blocker.**
2. **🟨 `getCourseCount` has no language fallback.** The en-catalog fix touched only `getCourses`; `getCourseCount` (`courses.api.ts:187-196`) still hard-filters `.eq('language', language)`. EN visitor → 0 → `HeroSection.tsx:39` only sets state `if (count>0)` → falls back to hardcoded `useState(15)`. Hero advertises "15+ courses" while the catalog shows 3 — wrong and internally inconsistent. → Mirror the getCourses fallback in getCourseCount (S).
3. **🟨 CMS/marketing sections swallow fetch failures.** `FeaturedCoursesSection` returns null on both empty AND failed fetch (`:37-38,78`) — a Supabase outage silently removes whole marketing bands rather than degrading. Error states as a category were never reviewed. → Distinguish error from empty; render a degraded state.
4. **🟨 i18n is masked, not solved.** The EN fallback serves Malayalam-titled courses to English visitors with no "showing all languages" signal. Underlying 0-EN-content gap untreated.
5. **🟨 Asset refund/revocation integrity.** `refund-process/index.ts:195-200` documents that `asset_purchases` UNIQUE(user_id,asset_id) holds only the first order_id, so an asset owned directly + via bundle survives a single-order refund; external_url assets are unrevocable bearer links (refunded buyer keeps the file forever). Neither is tracked.
6. **🟨 No a11y pass on any changed surface.** Banner contrast (3:1 < AA 4.5:1), LanguageToggle, savings-pop, and mobile menu dialog (`Layout.tsx:241` sets `role=dialog` but no focus trap / Escape). `/audit-a11y` exists; no evidence it ran.

**Unverified (need live infra, not a code read):** prod deploy state / bundle hash (Cloudflare Pages); that prod actually ran 046-054 matching the files given documented 030/031 drift; all visual/paint/layout-shift claims (need Chrome + real device); the cms-revert persistence round-trip; "900/900" (suite not run this session); live SELECT grants on `digital_assets` for anon/authenticated.

---

## 5. Prioritized fix plan

Security and user-blocking first; cosmetics last.

| # | What | Why it matters | Files | Effort | Migration? | Prod deploy? |
|---|------|----------------|-------|--------|-----------|--------------|
| 1 | REVOKE `SELECT (storage_path, external_url)` from anon+authenticated (or view/secrets table) + anon-can't-read RLS test | **Free-download paywall bypass + R2 key leak** via public anon key; blocks asset feature | new migration 055; `supabase/migrations/`; new RLS test | M | ✅ | ✅ (DB only) |
| 2 | Re-pin the 6 SECURITY DEFINER fns as `search_path = public, pg_temp`; add verify-migrations assertion | `pg_temp` shadow → `is_admin()` privilege escalation | migration 056; `scripts/verify-migrations.sh` | S | ✅ | ✅ (DB only) |
| 3 | Deploy frontend HEAD to production (gated `/promote-to-prod`) | ~18 "fixed" issues are unresolved for reporters until this ships (about-paste, course-includes, en-catalog, banners, breadcrumb, footer, pricing, CMS editability…) | — | S | ❌ | ✅ (explicit) |
| 4 | Breadcrumb: move dynamic-label lookup before UUID guard; fix dead `/course` link; add test | Every admin-created (UUID) course still shows no title — the reported bug | `components/Breadcrumbs.tsx`; new test | S | ❌ | ✅ |
| 5 | en-catalog: keep fallback when filters active OR add "all languages" notice; add `getCourseCount` fallback | Searching re-empties a visible catalog; hero "15+" contradicts 3 courses | `courses.api.ts`; `HeroSection.tsx`; `components/sections/CatalogSection.tsx` | M | ❌ | ✅ |
| 6 | cms-revert / cms-pageorder: point `ContentPage` at deterministic ordering + `is_active`; data-cleanup + partial UNIQUE for singletons; behavioral test; document trigger dep | Admin Live/Ignored badge lies; edits "disappear" through the diagnostic UI | `pages/admin/ContentPage.tsx`; `services/api/admin.api.ts`; migration 057; new test | M | ✅ (cleanup+index) | ✅ |
| 7 | asset-badges: derive 3rd badge from `asset.license`; real-TrustBadges test | Checkout falsely promises commercial rights (licensing misrepresentation) | `pages/AssetCheckout.tsx`; `components/TrustBadges.tsx`; test | S | ❌ | ✅ |
| 8 | cms-stats: seed stat rows on create (`default` or empty-state) + `buildMetadata` branch + number coercion + add/remove; 2 tests | Admin still can't edit stat numbers via intended UI | `pages/admin/content/sectionSchemas.ts`; `ContentPage.tsx`; tests | M | ❌ | ✅ |
| 9 | Banner contrast: `max(contrast(bg,#111),contrast(bg,#fff))` pivot; threshold→4.5; handle var/named/hsl bg; mid-tone + default-bg tests | Invisible banner still reproducible with the field's own suggested value | `components/AnnouncementBanner.tsx`; tests | S | ❌ | ✅ |
| 10 | price/pricing storefront: use real `comparePrice` or document synthetic; default plain-text or compute `min` "Starting at"; drop ×1.5/×2 fabrication; add `compare_price` to bundle/related selects; test | Storefront invents MRP/savings; product coupling user asked removed | `components/sections/PricingSection.tsx`; `courses.api.ts`; test | M | ❌ | ✅ |
| 11 | asset-drive polish: move `getR2()` check into non-external branch; `createAsset`→`mapAdminAsset`; keep `isExternal`; behavioral+DB-CHECK test; editor Drive-link guidance | Latent 500 on external download if R2 misconfig; `externalUrl` round-trip | `supabase/functions/asset-download-url/index.ts`; `services/api/digitalAssets.api.ts`; `DigitalAssetEditorPage`; test | S | ❌ | ✅ (fn deploy) |
| 12 | course-includes: fallback only for null not empty; deploy; CMS+default render tests | Clear-all footgun; deploy gap | `pages/course-details/CourseDetails.tsx`; tests | S | ❌ | ✅ |
| 13 | footer-shift: reset `isLoading`/clear courses in `[language]` effect; EN empty-state/ML fallback; test | Language-toggle collapse; EN loses whole section | `FeaturedCoursesSection.tsx`; test | S | ❌ | ✅ |
| 14 | bundle-value: surface savings+tag in desktop price block; real expiry or rename tag; test | 2 of 3 asks invisible to desktop buyers; "Limited time" never expires | `CourseDetails.tsx`; `CourseDetailsSidebar.tsx`; `pricing_copy`; test | M | ❌ | ✅ |
| 15 | footer-cms: move/dedupe bottom-bar Privacy/Terms+copyright into CMS; guard blank titles; grouping render test | Hardcoded duplicates drift from CMS-edited links | `components/Layout.tsx`; test | M | ❌ | ✅ |
| 16 | catalog-editable: decide scope for hardcoded strings; add CatalogSection + AssetsCatalogSection CMS tests | "Every data editable" unmet; both paths untested | `CatalogSection.tsx`; `AssetsCatalogSection.tsx`; `Contact.tsx`; tests | M | maybe | ✅ |
| 17 | Error-state + a11y pass: distinguish fetch-fail from empty in marketing sections; run `/audit-a11y`; focus trap+Escape on mobile dialog | Outage hides sections; AA contrast/focus gaps | `FeaturedCoursesSection.tsx`; `Layout.tsx`; sections | M | ❌ | ✅ |
| 18 | opportunity-cards: center `HorizontalGallery` desktop grid or match column count to items; non-vacuous centering test | Actual open bug — cards left-shifted on desktop | `components/HorizontalGallery.tsx`; `FeaturedCoursesSection.tsx`; `ValuePropsSection.tsx`; test | S | ❌ | ✅ |
| 19 | ticker: confirm "slow" intent; add `sm:` marquee duration; fake-timer + two-track tests | Speed regressed ~3×; fix unprotected | `index.css`; `HeroCarousel.tsx`; tests | S | ❌ | ✅ |
| 20 | catalog-nav: real-device verify then delete `ViewportProbe`; `.viewport-anchor` test; iOS-15 fallback | Nav still rides toolbar shift; unverified diagnostic shipping | `Layout.tsx`; `ViewportProbe.tsx`; `index.css`; test | M | ❌ | ✅ (after device check) |
| 21 | flash (optional): neutral skeleton instead of hardcoded defaults while `useSiteSection` null, or build-time inline; HeroSection test | Cold-cache + stale-swap flash residual | `SiteContentContext.tsx`; `HeroSection.tsx` | M–L | ❌ | ✅ |
| 22 | sec-paywall + about-paste hardening: add live RLS regression test; guard 050's single-row rescue / verify prod loss | Trigger unguarded by tests; migration data-loss risk | tests; future migration note | S | ❌ | — |

**Do items 1-3 before any production release.** Items 1 and 2 are DB-only and can ship independently of the frontend deploy; item 3 (the prod frontend deploy) is what actually delivers the ~18 dev-only fixes to the users who reported them, and must go through the explicit gated prod-deploy path.