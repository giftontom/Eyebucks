# Known Issues

Last updated: March 21, 2026

---

## Bugs

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

### 11. HashRouter prevents SEO indexing of public pages (decision pending)

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **File** | `App.tsx` |

**Description:**
The app uses `HashRouter` (URLs like `/#/course/x`), which was chosen during early development for simplicity with Cloudflare Pages static hosting. Hash-based URLs are not crawled by search engine bots, meaning the Storefront, CourseDetails, and other public pages cannot be indexed. As the product approaches launch, this is a discoverability concern.

**Options:**
- Switch to `BrowserRouter` + configure Cloudflare Pages `_redirects` to serve `index.html` for all routes (standard SPA pattern)
- Keep HashRouter and accept no SEO (acceptable if growth is paid/referral only)

Decision is pending product/marketing input.

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
