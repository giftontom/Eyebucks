# UI/UX Review & Project Update Plan

**Date:** June 4, 2026
**Branch reviewed:** `ui-ux-phase-0-2`
**Method:** Code inspection + live Playwright walkthrough of each page in **light/dark** × **desktop (1440×900) / mobile (390×844)**, logged in as an admin user against the local dev server.

---

## 1. Reported Bugs

### 1a. "My Learning and Alerts show the same page (My Studio)"
**Status: Already fixed on this branch — the live dev site is just stale.**

On `main` (what `dev.eyebuckz.com` currently serves) the `Notifications` page did not exist and the bottom-nav "Courses" tab pointed at `/`. Commit `9011a24` on this branch fixed it:

| Bottom-nav tab | Route | Page |
|---|---|---|
| My Learning | `/dashboard` | "My Studio" (enrolled courses, progress) |
| Alerts | `/notifications` | "Notifications" (distinct page) |

Verified live: `/dashboard` → title *"My Studio"*, `/notifications` → title *"Notifications"* with separate content. **Action: deploy this branch to the dev project's production branch** (the earlier deploy only created a *preview* URL, so `dev.eyebuckz.com` never updated — see §5).

### 1b. "Scrolling issue — opening another page keeps the previous page's scroll position"
**Status: FIXED in this session.**

Root cause: `BrowserRouter` does not reset scroll on navigation, and the app had no scroll-restoration handler. Reproduced live: scrolling the Storefront then navigating to `/courses` left the new page at `scrollY≈434`.

Fix: added `components/ScrollToTop.tsx`, mounted once inside `<BrowserRouter>` in `App.tsx`. It scrolls to top on PUSH/REPLACE navigations, preserves position on browser back/forward (POP), and honours `#hash` anchors. Verified live: navigations now land at `scrollY≈0`.

---

## 2. What's Working Well

- **Theming** is consistent and polished in both light and dark across every page — no contrast failures, no hardcoded colors bleeding through. The token system (`t-bg`, `t-text`, status vars) is paying off.
- **Mobile reflow** is clean; the elevated 5-tab bottom nav (Home · Courses · My Learning · Alerts · Profile) is well designed and the tabs are correctly distinct.
- **Accessibility foundations** are present: skip-to-content link, ARIA labels, breadcrumbs, focus-visible rings.
- **Design system** (cards, badges, buttons, brand-red accents) reads as a cohesive, professional product.

---

## 3. UI/UX Issues Found (with fixes)

| # | Severity | Area | Issue | Suggested fix |
|---|----------|------|-------|---------------|
| U1 | **High** | Storefront | Scroll-reveal animations leave content at `opacity:0` until scrolled into view. 40 elements stayed invisible in a full-page capture; if the IntersectionObserver doesn't fire (reduced-motion, bots, slow JS) content is blank. | Make content visible by default; treat reveal as progressive enhancement. Add a `@media (prefers-reduced-motion: reduce)` rule forcing `opacity:1; transform:none`. Ensure observers use a sane `rootMargin` and a fallback timer. |
| U2 | **High** | Storefront / Courses | Course **skeletons never resolve to an empty state** when there are no courses — perpetual shimmer instead of a "No courses yet" message. | Add explicit empty-state UI when the query returns `[]` (distinct from loading). |
| U3 | **High** | `/courses` | **Non-uniform card grid** — bundle/MODULE cards render at different widths/heights, breaking grid alignment (the "Content Selection" bundle card is much larger than its neighbours). | Normalize card dimensions (fixed aspect-ratio thumbnail, `line-clamp` on title/description, equal-height grid items via `grid-auto-rows`/`items-stretch`). |
| U4 | **High** | Pricing everywhere | **Inconsistent currency formatting**: ₹999, ₹149.99, ₹34.99, ₹3,999 mixed on the same screen — some values carry decimals, some don't, suggesting paise-vs-rupee inconsistency in data or formatting. | Single `formatPrice(paise)` util used everywhere (group digits, consistent/no decimals). Audit DB `price` values for unit consistency. |
| U5 | Medium | Catalog / Dashboard | **Test & inconsistent seed data leaking into UI**: "Test sha" course (description "jj"), a Bundle priced ₹34.99 cheaper than an individual course at ₹2,286.75, and ratings like 4.8 with "0 Students". | Clean seed data; hide unpublished/test courses from public lists; suppress rating when `totalStudents === 0`. |
| U6 | Medium | Cards | Missing thumbnails fall back to a clapperboard placeholder ("Test sha"). Placeholder works but signals data gaps. | Keep the graceful placeholder; ensure all real courses have thumbnails before launch. |
| U7 | Low | Dashboard | Two enrolled-course cards sit in a row that doesn't fill the width, leaving dead space on the right. | Use a responsive 3-up grid or widen cards to fill the row. |
| U8 | Low | Notifications / Profile | Narrow centered column leaves large empty side gutters on desktop. | Acceptable, but consider a slightly wider `max-w` or a two-column layout for Profile. |
| U9 | Low | SEO/titles | Brief flash of the generic `<title>` before Helmet sets the per-page title on lazy routes. | Pre-set titles or add a default per-route to avoid the flash. |

---

## 4. Logical / Technical Issues

| # | Severity | Issue | Notes / fix |
|---|----------|-------|-------------|
| L1 | **High** | **Stale dev deployment** — `dev.eyebuckz.com` runs `main`, missing the Phase 0–2 fixes (Notifications page, nav routes, etc.). | Deploy this branch to the eyebucks-dev **production branch** (§5), or merge to `main` first. |
| L2 | Medium | **Vite dev re-optimization quirk** surfaces as a full ErrorBoundary screen ("Invalid hook call / Cannot read properties of null") on the *first* load of a lazy route after a dev-server restart. Dev-only, settles on reload. | Pre-bundle React in `vite.config` `optimizeDeps.include` (`react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`) to reduce the re-optimization flash. Not a production bug. |
| L3 | Medium | Reveal-on-scroll content (U1) is also a **mild SEO/crawler risk** — important copy is `opacity:0` in the initial DOM paint. | Same fix as U1 (visible-by-default). |
| L4 | Low | `price` data appears to mix units (U4) — a correctness risk at checkout if the same value feeds Razorpay. | Confirm all prices are stored in paise and formatted once at the edge. |

---

## 5. Deploying the fixes to the dev domain

The earlier `wrangler pages deploy` ran on branch `ui-ux-phase-0-2`, which Cloudflare treats as a **preview** deployment (`https://ui-ux-phase-0-2.eyebucks-dev.pages.dev`). The custom domain `dev.eyebuckz.com` is served by the project's **production branch**, so it didn't update.

To update `dev.eyebuckz.com`, deploy to the production branch explicitly:

```bash
npm run build
npx wrangler pages deploy dist --project-name eyebucks-dev \
  --branch <prod-branch> --commit-dirty=true
```

(Confirm the project's production branch name in the Cloudflare dashboard — commonly `main` or `production`.) Auth note: use the `Eyebuckzwb@gmail.com` account / its API token — `tomatrixdigital@gmail.com` lacks access to the eyebuckz account.

---

## 6. Prioritized Update Plan

### P0 — Do before the next dev/prod deploy
1. ~~Scroll-to-top on navigation~~ ✅ done (`ScrollToTop.tsx`).
2. Deploy this branch to the dev **production branch** so `dev.eyebuckz.com` reflects the Phase 0–2 fixes (L1, fixes reported bug 1a live).
3. Currency formatting util + DB price-unit audit (U4 / L4) — correctness + trust.
4. Empty-state handling for course lists; stop infinite skeletons (U2).
5. Reveal animations visible-by-default + `prefers-reduced-motion` (U1 / L3).

### P1 — Next iteration
6. Uniform course-card grid on `/courses` (U3).
7. Clean seed/test data; hide test courses; suppress 0-student ratings (U5).
8. Dashboard enrolled-courses grid fills width (U7).
9. `optimizeDeps.include` to tame the dev re-optimization quirk (L2).

### P2 — Polish
10. Per-page `<title>` flash (U9), Profile/Notifications desktop width (U8), thumbnail coverage audit (U6).

---

## 7. Coverage

Pages walked through this session: Storefront (light+dark, desktop+mobile), Courses, Course catalog cards, Dashboard "My Studio", Notifications, Profile, mobile bottom nav. Public legal pages (Privacy/Terms — hardcoded "March 14, 2026"), Contact, About, Checkout, and Learn were spot-checked via routing/code; a full visual pass on Checkout + Learn (video player) is recommended as a follow-up since they were not exercised end-to-end here.
