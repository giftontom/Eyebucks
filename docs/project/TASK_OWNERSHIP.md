# Eyebuckz LMS — Task Ownership

> Last updated: March 19, 2026

---

## Introduction

This document tracks all outstanding tasks before launch, split into two categories:

- **AI tasks (A#):** Code changes that Claude can execute. Tell Claude "do A6" and it will implement the task according to the spec below. Mark as `[x]` when done.
- **Owner tasks (O#):** Require manual action, credentials, or a business decision. Only the project owner can complete these.

See `docs/project/LAUNCH_CHECKLIST.md` for a condensed checklist view.

---

## AI Tasks

### Phase 0 — Fix before anything else

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A1 | [ ] | P0 | 2h | **Fix 3 failing `useModuleProgress` tests.** Wrap `vi.advanceTimersByTime()` in `act()`, use `waitFor()` for async state assertions. Affects: `calls updateTimestamp on subsequent auto-saves`, `shows completion notification then clears it after 3 seconds`, `skips checkCompletion when already completed`. File: `src/__tests__/hooks/useModuleProgress.test.ts` |

---

### Phase 1 — Test coverage (pre-launch P1)

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A2 | [ ] | P1 | 1.5h | **Extend `coursesApi.test.ts` with edge cases.** Add: bundle-type course returns `bundledCourses[]`, slug starting with 'c' is treated as slug (not UUID), enrolled user gets full `videoId`/`videoUrl`, admin user bypasses enrollment check. File: `src/__tests__/services/coursesApi.test.ts` |
| A3 | [ ] | P1 | 1h | **Extend `CourseDetails.test.tsx` for review summary.** Mock `get_review_summary` RPC response, assert average rating and star distribution bars render. File: `src/__tests__/pages/CourseDetails.test.tsx` |
| A4 | [ ] | P1 | 1h | **Extend `Profile.test.tsx` for certificate list.** Add: multiple certificates display, download link present, empty state message. File: `src/__tests__/pages/Profile.test.tsx` |
| A5 | [ ] | P1 | 1.5h | **Extend `Checkout.test.tsx` for coupon flow.** Add: coupon input renders, `apply_coupon` RPC mock, discounted price updates in UI, invalid coupon error message. File: `src/__tests__/pages/Checkout.test.tsx` |

---

### Phase 2 — Admin page tests (pre-launch P1)

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A6 | [ ] | P1 | 3h | **New: `PaymentsPage.test.tsx`.** Render payment list, refund button opens confirmation, `processRefund` called on confirm, row updates to "refunded", already-refunded payments block the button. File: `src/__tests__/pages/admin/PaymentsPage.test.tsx` |
| A7 | [ ] | P1 | 2.5h | **New: `CoursesPage.test.tsx`.** Render course list with status badges, publish/draft toggle calls `adminApi.updateCourse`, soft-delete removes row, loading and empty states. File: `src/__tests__/pages/admin/CoursesPage.test.tsx` |
| A8 | [ ] | P1 | 3h | **New: `UserDetailPage.test.tsx`.** Render user info and enrollment list, manual enroll button opens course picker, `adminApi.enrollUser` called, new enrollment appears in list. File: `src/__tests__/pages/admin/UserDetailPage.test.tsx` |
| A9 | [ ] | P1 | 2.5h | **New: `CertificatesPage.test.tsx`.** Render certificate list, revoke certificate updates status, issue certificate calls `certificate-generate` Edge Function mock. File: `src/__tests__/pages/admin/CertificatesPage.test.tsx` |

---

### Phase 3 — Secondary gaps (post-launch P2)

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A10 | [ ] | P2 | 2h | **Extend `NotificationBell.test.tsx` for Realtime.** Mock Supabase Realtime channel; simulate INSERT event arriving; assert new notification appears in dropdown without page reload. File: `src/__tests__/components/NotificationBell.test.tsx` |
| A11 | [ ] | P2 | 2h | **Extend `Dashboard.test.tsx` and `Learn.test.tsx` with edge cases.** Dashboard: progress % display per course. Learn: module navigation (next/prev), free-preview module accessible without enrollment. |
| A12 | [ ] | P2 | 1h | **Extend `PurchaseSuccess.test.tsx` for webhook poll path.** Mock `checkOrderStatus` returning `pending` then `completed`. Assert polling logic shows loading state and then success. |

---

### Phase 4 — E2E (post-launch P2)

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A13 | [ ] | P2 | 3h | **E2E auth fixtures.** Create `e2e/fixtures/auth.ts` with authenticated Playwright browser contexts (user and admin) using Supabase service-role token injection. Avoids UI login on every E2E test. |
| A14 | [ ] | P2 | 4h | **E2E checkout spec.** File: `e2e/checkout.spec.ts`. Full purchase journey: browse → course details → enroll → Razorpay test modal → test card → success page → enrollment appears in dashboard. Requires Razorpay test mode keys. |
| A15 | [ ] | P2 | 3h | **E2E learn spec.** File: `e2e/learn.spec.ts`. Post-enrollment flow: access learn page → video loads → navigate between modules → progress saves (verify API call in Playwright network log). |

---

### Infrastructure (when tooling available)

| # | Status | Priority | Est. Effort | Description |
|---|--------|----------|-------------|-------------|
| A20 | [ ] | P1 (if O1=switch) | 2h | **BrowserRouter migration.** Replace `HashRouter` with `BrowserRouter` in `App.tsx`. Create `public/_redirects` with `/* /index.html 200`. Update any hash-based links in tests. Blocked on O1 decision. |
| A23 | [ ] | Low | 30m | **Regenerate `types/supabase.ts`.** Requires Docker running locally. Run: `supabase gen types typescript --local > types/supabase.ts`. Removes stale `sessions`/`refresh_tokens` tables and adds types for migrations 022-023. |

---

## Owner Tasks

| # | Status | Priority | Dependencies | Description |
|---|--------|----------|--------------|-------------|
| O1 | [ ] | P1 | — | **HashRouter vs BrowserRouter decision.** Accept no SEO (keep HashRouter) or switch to BrowserRouter for crawlability. If switching, assign A20. |
| O2 | [ ] | P0 | — | **Switch Razorpay to live keys.** Set `VITE_RAZORPAY_KEY_ID=rzp_live_...` in Cloudflare Pages. Run `supabase secrets set RAZORPAY_KEY_ID=rzp_live_... RAZORPAY_KEY_SECRET=<secret>`. |
| O3 | [ ] | P0 | — | **Verify eyebuckz.com domain in Resend.** Add DKIM/SPF DNS records in Cloudflare DNS. Confirm domain shows "Verified" in Resend dashboard. Without this, emails fail or land in spam. |
| O4 | [ ] | P0 | O2, O3, O13 | **Full smoke test.** Login → purchase → watch → complete → certificate. Verify 3 emails arrive. Must use live Razorpay keys. |
| O5 | [ ] | P1 | O13 | **Razorpay webhook smoke test.** Send test event from Razorpay dashboard → Webhooks. Verify `{ "status": "ok" }` response and no errors in Edge Function logs. |
| O6 | [ ] | P1 | O4 | **Resend delivery verification.** Check Resend dashboard after O4 smoke test. Confirm 3 emails delivered (enrollment welcome, payment receipt, certificate). |
| O7 | [ ] | P0 | — | **Confirm no dev login in production bundle.** Open `eyebuckz.com/#/login` in incognito. No "Dev Login" button. Search minified JS for `loginDev` — should not appear. |
| O8 | [ ] | P1 | — | **Verify all env vars.** Run `/env-diff`. Check Cloudflare Pages (both projects) and `supabase secrets list`. |
| O10 | [ ] | Low | — | **Upgrade Supabase CLI** from v2.62.10 to v2.78.1+. `brew upgrade supabase`. |
| O12 | [ ] | P1 | — | **Push 18 commits to remote.** `git push origin main` |
| O13 | [ ] | P0 | — | **Deploy Edge Functions with new email templates.** `supabase functions deploy checkout-verify && supabase functions deploy certificate-generate` (or `supabase functions deploy` for all). |

---

## Critical Path to Launch

The minimum sequence for a safe first deploy:

```
O2 (live Razorpay keys)
  → O3 (Resend domain verified)
  → O13 (deploy Edge Functions)
  → A1 (fix failing tests — CI must be green)
  → Quality gates pass (lint + type-check + tests + build)
  → O12 (push to GitHub)
  → Deploy frontend: npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
  → O7 (confirm no dev login on live site)
  → O4 (full smoke test)
  → O5 + O6 (webhook + email verification)
```

**Optional but recommended before taking payments:** O1 decision (SEO routing), O8 (env audit).

---

## How to Use This Doc

**For the owner:**
- Review Owner Tasks (O#) and tick off as completed
- Make O1 decision early (affects A20)
- O2, O3, O13 are blockers for O4 — do these first

**For AI (Claude):**
- When told "do A6", read the A6 row above, then cross-reference `docs/project/TEST_PLAN.md` for full test case details before writing any code
- After completing a task, mark it `[x]` in this file and in `LAUNCH_CHECKLIST.md`
- Always run `npm test -- --run` after writing tests to confirm they pass
