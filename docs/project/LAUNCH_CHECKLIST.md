# Eyebuckz LMS — Pre-Launch Checklist

> Last updated: March 21, 2026

This checklist tracks everything that must be done before opening eyebuckz.com to paying users. Tasks are split into **Owner tasks** (require manual action or credentials) and **AI tasks** (code changes Claude can execute on request).

Mark items with `[x]` as they are completed.

---

## Owner Tasks (Manual)

### Infrastructure & Configuration

- [ ] **O1 — HashRouter vs BrowserRouter decision**
  Switch to `BrowserRouter` + Cloudflare `_redirects` for SEO (recommended), OR consciously accept HashRouter and no organic search indexing. Decision required before deploy. If switching: assign task A20.

- [ ] **O2 — Switch Razorpay to live keys**
  Update `VITE_RAZORPAY_KEY_ID` in Cloudflare Pages → `rzp_live_...`
  Run `supabase secrets set RAZORPAY_KEY_ID=rzp_live_... RAZORPAY_KEY_SECRET=<live_secret>`

- [ ] **O3 — Verify eyebuckz.com domain in Resend dashboard**
  Add DNS TXT records for DKIM/SPF in Cloudflare DNS. Verify domain is confirmed in Resend → Domains. Without this, emails go to spam or are rejected.

- [ ] **O10 — Upgrade Supabase CLI**
  Current: v2.62.10 → Target: v2.78.1 (or latest stable)
  `brew upgrade supabase`
  Then re-link: `supabase link --project-ref pdengtcdtszpvwhedzxn`

- [ ] **O12 — Push git history to remote**
  Local branch is 18+ commits ahead of `origin/main`. Before launch:
  ```bash
  git push origin main
  ```

### Deployment

- [ ] **O13 — Deploy Edge Functions with email templates**
  The `emailTemplates.ts` shared module was added to `_shared/`. Redeploy the two functions that import it:
  ```bash
  supabase functions deploy checkout-verify
  supabase functions deploy certificate-generate
  ```
  Optionally deploy all:
  ```bash
  supabase functions deploy
  ```

### Payment & Email Smoke Tests

- [ ] **O4 — Full end-to-end smoke test**
  In a fresh incognito window on production (eyebuckz.com):
  1. Sign in with Google
  2. Browse to a paid course
  3. Click Enroll → complete Razorpay payment with live test card
  4. Verify enrollment appears in Dashboard
  5. Watch 95%+ of module 1 → verify module marked complete
  6. Complete all modules → verify certificate appears on Profile
  7. Check 3 emails received: enrollment welcome, payment receipt, certificate

- [ ] **O5 — Razorpay webhook smoke test**
  In Razorpay dashboard → Webhooks → send a test `payment.captured` event to the `checkout-webhook` URL. Verify:
  - No 4xx/5xx in Supabase Edge Function logs
  - The test event returns `{ "status": "ok" }`

- [ ] **O6 — Resend email delivery confirmation**
  After O4, check Resend dashboard → Emails. Confirm 3 emails were delivered (not bounced or spam-filtered). Check the rendering looks correct with the branded templates.

### Security

- [ ] **O7 — Verify dev login button hidden in production**
  In an incognito window on `eyebuckz.com/#/login`, confirm:
  - No "Dev Login" button is visible in the UI
  - No `loginDev` or `admin@eyebuckz.com` appears in minified JS (check via DevTools → Sources → search)

### Environment

- [ ] **O8 — Run `/env-diff` to verify all env vars are present**
  Check that Cloudflare Pages (both `eyebucks` and `eyebucks-dev` projects) have all required `VITE_` variables set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_RAZORPAY_KEY_ID`

  And that all Supabase secrets are set:
  ```bash
  supabase secrets list
  ```
  Required: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_CDN_HOSTNAME`, `BUNNY_STREAM_TOKEN_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`

---

## AI Tasks (Code — tell Claude "do A#")

### P0 — Must complete before ship

- [x] **A1 — Fix 3 failing `useModuleProgress` tests** — DONE (commit `7bb0e7c`)
  See `docs/project/TEST_PLAN.md` → Phase 1 → A1 for details.

### P1 — Before launch (quality gate)

- [x] **A2 — `coursesApi.test.ts` edge cases** (bundle type, slug-starting-with-c, enrolled user videoId) — DONE (commit `7bb0e7c`)
- [x] **A3 — `CourseDetails.test.tsx` review summary** (RPC mock + average rating display) — DONE (commit `7bb0e7c`)
- [x] **A4 — `Profile.test.tsx` certificate list** (multiple certs, download link, empty state) — DONE
- [x] **A5 — `Checkout.test.tsx` coupon flow** (apply, discount display, mock payment path) — DONE
- [x] **A6 — `PaymentsPage.test.tsx`** — DONE (`src/__tests__/pages/admin/PaymentsPage.test.tsx` exists)
- [x] **A7 — `CoursesPage.test.tsx`** — DONE (`src/__tests__/pages/admin/CoursesPage.test.tsx` exists)
  See `docs/guides/ADMIN_TEST_GUIDE.md` as canonical pattern reference
- [x] **A8 — `UserDetailPage.test.tsx`** — DONE (`src/__tests__/pages/admin/UserDetailPage.test.tsx` exists)
- [x] **A9 — `CertificatesPage.test.tsx`** — DONE (`src/__tests__/pages/admin/CertificatesPage.test.tsx` exists)

### P1.5 — Admin page tests (before launch, quality gate)

The 8 remaining untested admin pages. Writing guide: `docs/guides/ADMIN_TEST_GUIDE.md`

- [x] **A16 — `DashboardPage.test.tsx`** — DONE (`src/__tests__/pages/admin/DashboardPage.test.tsx` exists)
- [x] **A17 — `UsersPage.test.tsx`** — DONE (`src/__tests__/pages/admin/UsersPage.test.tsx` exists)
- [x] **A18 — `CouponsPage.test.tsx`** — DONE (`src/__tests__/pages/admin/CouponsPage.test.tsx` exists)
- [x] **A19 — `ReviewsPage.test.tsx`** — DONE (`src/__tests__/pages/admin/ReviewsPage.test.tsx` exists)
- [x] **A21 — `ContentPage.test.tsx`** — DONE (`src/__tests__/pages/admin/ContentPage.test.tsx` exists)
- [x] **A22 — `AuditLogPage.test.tsx`** — DONE (`src/__tests__/pages/admin/AuditLogPage.test.tsx` exists)
- [x] **A24 — `CourseEditorPage.test.tsx`** — DONE (`src/__tests__/pages/admin/CourseEditorPage.test.tsx` exists)
- [x] **A25 — `SettingsPage.test.tsx`** — DONE (`src/__tests__/pages/admin/SettingsPage.test.tsx` exists)

### P2 — Post-launch (quality improvements)

- [ ] **A10 — `NotificationBell` Realtime subscription test**
- [ ] **A11 — Dashboard/Learn edge cases** (progress display, module nav, free-preview)
- [ ] **A12 — `PurchaseSuccess` webhook poll path**
- [ ] **A13 — E2E auth fixtures** (Playwright browser contexts for user + admin)
- [ ] **A14 — E2E checkout flow** (full Razorpay test-mode purchase journey)
- [ ] **A15 — E2E learn flow** (video load, navigation, progress save)

### Infrastructure (when available)

- [ ] **A20 — BrowserRouter migration** (only if O1 = switch; update `App.tsx` + add `public/_redirects`)
- [ ] **A23 — Regenerate `types/supabase.ts`** (requires Docker: `supabase gen types typescript --local`)

---

## Quality Gates (CI — must all pass)

These run automatically during `/pre-commit` and `/promote-to-prod`:

- [ ] `npm run lint` — zero ESLint errors
- [ ] `npm run type-check` — zero TypeScript errors
- [ ] `npm test -- --run` — all tests pass (0 failures)
- [ ] `npm run build` — clean production build, no warnings
- [ ] Lighthouse performance score ≥ 90 on Storefront
- [ ] WCAG 2.1 AA — zero accessibility violations (already passing as of March 2026)

---

## Post-Launch Monitoring (First 48 Hours)

- [ ] Monitor Supabase Edge Function logs for errors: `supabase functions logs --tail`
- [ ] Check PostHog for user flow dropoffs (storefront → course → checkout → success)
- [ ] Verify Sentry has no new unhandled errors
- [ ] Confirm Razorpay webhook is receiving events in Razorpay dashboard → Webhooks → Event Log
- [ ] Check Resend dashboard for bounce/spam rates

---

## Reference

- Task descriptions: `docs/project/TASK_OWNERSHIP.md`
- Test patterns: `docs/guides/TESTING.md`
- Admin page test guide: `docs/guides/ADMIN_TEST_GUIDE.md`
- Deployment steps: `docs/guides/DEPLOYMENT.md`
- Known issues: `docs/project/KNOWN_ISSUES.md`
