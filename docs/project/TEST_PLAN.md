# Eyebuckz LMS — Test Plan

> Last updated: March 19, 2026

---

## Executive Summary

As of March 19, 2026: **36 test files, 316 total tests** across services, hooks, components, and pages. The test suite reaches the 50% V8 coverage threshold. This document identifies gaps, defines the new test files needed before launch, and assigns effort estimates.

**Current state:**
- 8/13 API service modules have unit tests
- 5/10+ hooks have unit tests
- 3/20+ components have unit tests (excluding pages)
- 7/12 public pages have unit tests
- 0/12 admin pages have any tests
- 3 tests in `useModuleProgress.test.ts` are currently failing (timer/mock setup issues — see task A1)

---

## Coverage Matrix

| Feature Area | Covered | Test File | Gap |
|---|---|---|---|
| courses.api | Yes | `services/coursesApi.test.ts` | Admin/bundle edge cases |
| enrollments.api | Yes | `services/enrollmentService.test.ts` | Expiry, revoke paths |
| checkout.api | Yes | `services/checkoutApi.test.ts` | Full |
| payments.api | Yes | `services/paymentsApi.test.ts` | Full |
| certificates.api | Yes | `services/certificatesApi.test.ts` | Full |
| reviews.api | Yes | `services/reviewsApi.test.ts` | RPC mock for get_review_summary |
| progress.api | Yes | `services/progressApi.test.ts` | Full |
| users.api | Yes | `services/authService.test.ts` | Full |
| admin.api | **No** | — | All functions untested |
| notifications.api | **No** | — | All functions untested |
| siteContent.api | **No** | — | All functions untested |
| coupons.api | **No** | — | All functions untested |
| wishlist.api | **No** | — | All functions untested |
| useAccessControl | Yes | `hooks/useAccessControl.test.ts` | Full |
| useModuleProgress | Partial | `hooks/useModuleProgress.test.ts` | 3 failing tests (timer) |
| useScript | Yes | `hooks/useScript.test.ts` | Full |
| useVideoUrl | Yes | `hooks/useVideoUrl.test.ts` | Full |
| useWishlist | Yes | `hooks/useWishlist.test.ts` | Full |
| useRealtimeNotifications | **No** | — | Full hook untested |
| useStorefrontFilters | **No** | — | Filter/sort logic untested |
| useVideoPlayer | **No** | — | Video state abstraction untested |
| useModuleNotes | **No** | — | Notes CRUD untested |
| useAccessControl | Yes | `hooks/useAccessControl.test.ts` | Full |
| EnrollmentGate | Yes | `components/EnrollmentGate.test.tsx` | Full |
| Layout | Yes | `components/Layout.test.tsx` | Full |
| NotificationBell | Yes | `components/NotificationBell.test.tsx` | Full |
| ErrorBoundary | Yes | `ErrorBoundary.test.tsx` | Full |
| VideoPlayer | **No** | — | Untested |
| VideoUploader | **No** | — | Untested |
| Storefront | Yes | `pages/Storefront.test.tsx` | Full |
| Dashboard | Yes | `pages/Dashboard.test.tsx` | Full |
| Checkout | Yes | `pages/Checkout.test.tsx` | Full |
| CourseDetails | Yes | `pages/CourseDetails.test.tsx` | Full |
| Learn | Yes | `pages/Learn.test.tsx` | Full |
| Profile | Yes | `pages/Profile.test.tsx` | Full |
| PurchaseSuccess | Yes | `pages/PurchaseSuccess.test.tsx` | Full |
| Admin pages (all 12) | **No** | — | Zero test coverage |
| E2E: auth flow | Partial | `e2e/auth.spec.ts` | Fixture-based sign-in |
| E2E: checkout flow | **No** | — | Purchase journey |
| E2E: enrollment/learn | **No** | — | Video + progress |
| E2E: admin panel | **No** | — | Admin CRUD |

---

## Phase 1 — P1 Fixes and Core Gaps (Pre-launch blocker)

### A1: Fix `useModuleProgress.test.ts` failing tests

**File:** `src/__tests__/hooks/useModuleProgress.test.ts`

3 tests fail due to `vi.useFakeTimers()` / `act()` interaction with React state updates. Fix approach:

- Wrap timer advancement in `act()` consistently
- Ensure `vi.advanceTimersByTime()` is called inside `act()` for state-triggering timer callbacks
- Use `waitFor()` for async state assertions rather than immediate expects after timer advance

**Tests to fix:**
1. `calls updateTimestamp (not saveProgress) on subsequent auto-saves` — timer callback not flushing properly
2. `shows completion notification then clears it after 3 seconds` — `setTimeout` not advancing through act
3. `skips checkCompletion API call when module is already in moduleCompletionMap` — race condition in mock setup

**Effort:** ~2 hours

---

### A2: `coursesApi.test.ts` — additional edge cases

**File:** `src/__tests__/services/coursesApi.test.ts` (already exists, extend)

Add missing test cases:

| Test case | Description |
|-----------|-------------|
| `getCourse` — bundle type | Returns `bundledCourses[]` with nested module counts |
| `getCourse` — slug starting with 'c' | Correctly treated as slug (not UUID), no false positive |
| `getCourseModules` — enrolled user | Returns full `videoId` and `videoUrl` for paid modules |
| `getCourseModules` — admin user | Returns full `videoId` regardless of enrollment |

**Effort:** ~1.5 hours

---

### A3: `CourseDetails.test.tsx` — review summary display

**File:** `src/__tests__/pages/CourseDetails.test.tsx` (already exists, extend)

The review summary now uses the `get_review_summary` RPC. Ensure the mock chain correctly simulates the RPC response shape and that the page displays average rating and distribution bars.

**Effort:** ~1 hour

---

### A4: `Profile.test.tsx` — certificate list

**File:** `src/__tests__/pages/Profile.test.tsx` (already exists, extend)

Add test cases:
- Multiple certificates shown (count, course titles)
- Certificate download link present
- Empty state when no certificates

**Effort:** ~1 hour

---

### A5: `Checkout.test.tsx` — full payment flow

**File:** `src/__tests__/pages/Checkout.test.tsx` (already exists, extend)

Add test cases:
- Coupon code input + apply (success and invalid coupon paths)
- Discounted price display after coupon
- `VITE_MOCK_PAYMENT=true` path (dev mock)

**Effort:** ~1.5 hours

---

## Phase 2 — Admin Page Tests (P1, pre-launch)

Admin pages have zero test coverage and perform critical operations. Minimum viable tests per page: render without crash, loading state, empty state, primary action (create/update/delete/toggle).

### A6: `PaymentsPage.test.tsx`

**File:** `src/__tests__/pages/admin/PaymentsPage.test.tsx` (new)

| Test case | Description |
|-----------|-------------|
| Renders payment list | Shows order IDs, amounts, statuses |
| Loading state | Spinner shown while fetching |
| Empty state | "No payments found" message |
| Refund button | Opens confirmation dialog, calls `processRefund` |
| Refund success | Updates row to "refunded" status |
| Refund blocked for non-captured | Button disabled |

**Mock:** `vi.mock('services/api', () => ({ paymentsApi: mockPaymentsApi, adminApi: mockAdminApi }))`

**Effort:** ~3 hours

---

### A7: `CoursesPage.test.tsx`

**File:** `src/__tests__/pages/admin/CoursesPage.test.tsx` (new)

| Test case | Description |
|-----------|-------------|
| Renders course list | Shows titles, status badges |
| Publish/draft toggle | Calls `adminApi.togglePublish`, updates badge |
| Soft-delete | Calls `adminApi.deleteCourse`, removes row |
| Loading state | Spinner shown |
| Empty state | "No courses" message |

**Effort:** ~2.5 hours

---

### A8: `UserDetailPage.test.tsx`

**File:** `src/__tests__/pages/admin/UserDetailPage.test.tsx` (new)

| Test case | Description |
|-----------|-------------|
| Renders user info | Name, email, role badge, join date |
| Enrollment list | Shows all enrollments with status |
| Manual enroll button | Opens course picker, calls `adminApi.enrollUser` |
| Enrollment success | New row appears in list |

**Effort:** ~3 hours

---

### A9: `CertificatesPage.test.tsx`

**File:** `src/__tests__/pages/admin/CertificatesPage.test.tsx` (new)

| Test case | Description |
|-----------|-------------|
| Renders certificate list | Shows certificate numbers, student names, courses |
| Revoke certificate | Calls `adminApi.revokeCertificate`, updates status |
| Issue certificate | Opens form, calls `certificate-generate` Edge Function |
| Loading/empty states | Standard states |

**Effort:** ~2.5 hours

---

## Phase 3 — Secondary Gaps (P2, post-launch)

### A10: `NotificationBell.test.tsx` — Realtime subscription

Extend the existing `NotificationBell.test.tsx` to cover:
- Supabase Realtime INSERT event arrives → new notification appears in dropdown
- Mock the Realtime channel subscription

**Effort:** ~2 hours

---

### A11: `Dashboard.test.tsx` / `Learn.test.tsx` — edge cases

**Dashboard:** Add test for progress percentage display per enrolled course.

**Learn:** Add tests for:
- Module completion mark (95% threshold message)
- Module navigation (next/prev)
- Free-preview module accessible without enrollment

**Effort:** ~2 hours

---

### A12: `PurchaseSuccess.test.tsx` — webhook poll path

Add test case for the webhook polling path: when `checkOrderStatus` returns `pending` on first poll and `completed` on second poll.

**Effort:** ~1 hour

---

## Phase 4 — E2E Gaps (P2)

### A13: E2E auth fixtures

**File:** `e2e/fixtures/auth.ts`

Create authenticated Playwright browser contexts (user and admin) using Supabase test tokens to avoid logging in through the UI on every test.

**Effort:** ~3 hours

---

### A14: E2E checkout flow

**File:** `e2e/checkout.spec.ts`

Full purchase journey using Razorpay test mode:
- Browse → course details → enroll → Razorpay modal → test card → success page → enrollment active in dashboard

**Effort:** ~4 hours

---

### A15: E2E enrollment + video

**File:** `e2e/learn.spec.ts`

Post-enrollment learning flow:
- Access learn page for enrolled course
- Video loads (CDN URL confirmed in network requests)
- Module navigation works
- Progress is saved

**Effort:** ~3 hours

---

## Implementation Priority

| Priority | Tasks | Rationale |
|----------|-------|-----------|
| **P0 — Fix before ship** | A1 | 3 failing tests in CI |
| **P1 — Before launch** | A2, A3, A4, A5, A6, A7, A8, A9 | Core functionality coverage |
| **P2 — Post-launch** | A10, A11, A12, A13, A14, A15 | Edge cases and E2E |

---

## Running Tests

```bash
# All tests (watch mode)
npm test

# All tests once (CI)
npx vitest run

# Specific file
npx vitest src/__tests__/services/coursesApi.test.ts

# Coverage report (50% threshold enforced)
npm run test:coverage

# Vitest UI
npm run test:ui
```

See [TESTING.md](../guides/TESTING.md) for full patterns and mock templates.
