# Eyebuckz LMS - Project Context

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
If no skill matches after checking the triggers table AND `.claude/skills/_triggers.md`, proceed with manual implementation. Do not force an irrelevant skill.

### AMBIGUITY
If phrasing could match 2+ skills (e.g., "test this" → `run-tests` vs `e2e-test`), pick the most specific match. If genuinely ambiguous, ask one question, then invoke.

---

## Stack

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4 + React Router 7 (HashRouter)
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
- **Types:** `types/index.ts` (business types), `types/api.ts` (request/response), `types/supabase.ts` (auto-generated DB types).
- **Admin pages:** Split into sub-pages under `pages/admin/` with shared `AdminContext` and `AdminLayout`.

### Auth Flow (detailed)
1. Google OAuth → Supabase Auth
2. `handle_new_user` DB trigger → creates `public.users` row (`role='USER'`)
3. AuthContext mounts → `getSession()` → loads user profile from `public.users`
4. On SIGNED_IN: calls `session-enforce` Edge Function (3s timeout, lenient on network error)
5. Retries profile load with exponential backoff: 200ms → 400ms → 800ms → 1.6s → 3s

### Video Pipeline (detailed)
1. `useVideoUrl(videoId, fallbackUrl)` immediately serves CDN URL (Referer-header based)
2. Background: calls `video-signed-url` Edge Function → SHA256 token (1hr expiry)
3. If success: upgrades to signed URL, schedules auto-refresh 5min before expiry
4. If fail: falls back to CDN URL (works if Bunny token auth not enforced)
5. `VideoPlayer.tsx`: HLS.js streaming, quality switching, PiP, retry on error (3 attempts)

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

### 16 Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles synced from auth.users via trigger; has `role` ENUM, `phone_e164`, `google_id` |
| `courses` | Course catalog; `slug` UNIQUE; `price` in paise; soft-delete via `deleted_at` |
| `modules` | Course chapters; `video_id` is Bunny GUID; `order_index`; `is_free_preview` |
| `enrollments` | User-course access; `status` ENUM; `expires_at` for time-limited access |
| `progress` | Per-module watch progress; `timestamp`, `completed`, `watch_time`, `view_count` |
| `payments` | Razorpay transaction records; `razorpay_order_id`, `razorpay_payment_id` |
| `certificates` | Course completion certificates; `certificate_number`, `download_url`, `pdf_data` |
| `reviews` | Course ratings + comments; `helpful` upvote count |
| `notifications` | User notification inbox; `type` ENUM, `link`, `read` boolean |
| `site_content` | CMS blocks; `section`: faq\|testimonial\|showcase\|banner\|settings |
| `bundle_courses` | Junction: BUNDLE-type courses → individual courses; `order_index` |
| `coupon_uses` | Atomic coupon redemption records; `discount_pct` captured at use time |
| `coupons` | Discount codes; `discount_pct`, `max_uses`, `use_count`, `expires_at`, `is_active` |
| `wishlists` | User favorites; UNIQUE constraint on `(user_id, course_id)` |
| `login_attempts` | Auth audit trail; `ip_address`, `user_agent`, `success`, `fail_reason` |
| `audit_logs` | Admin action log; `action`, `entity_type`, `entity_id`, `old_value`, `new_value` |

### 6 ENUMs
- `user_role`: `USER` | `ADMIN`
- `course_type`: `BUNDLE` | `MODULE`
- `course_status`: `PUBLISHED` | `DRAFT`
- `enrollment_status`: `ACTIVE` | `EXPIRED` | `REVOKED` | `PENDING`
- `certificate_status`: `ACTIVE` | `REVOKED`
- `notification_type`: `enrollment` | `milestone` | `certificate` | `announcement` | `review`

### 15 RPC Functions
| RPC | Purpose |
|-----|---------|
| `apply_coupon(code, course_id, user_id)` | Atomic coupon validation + redemption → coupon_use_id, discount_pct |
| `complete_module(user_id, module_id, course_id)` | Marks module done, checks course completion → JSONB status |
| `expire_enrollments()` | Auto-expire past-due enrollments (run by pg_cron) → INTEGER count |
| `generate_receipt_number()` | Unique receipt string for payments |
| `get_admin_stats()` | KPI dashboard data → JSONB |
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
| New DB migration | `supabase/migrations/{NNN}_{description}.sql` | **Next number: 024** |
| New business type | `types/index.ts` | |
| New API type | `types/api.ts` | |

---

## Pages Catalog

### Public Pages (`pages/*.tsx`)
| Page | Route | Purpose |
|------|-------|---------|
| `Storefront.tsx` | `/` | Course catalog, hero carousel, filters, search |
| `CourseDetails.tsx` | `/course/:id` | Full course info, modules list, reviews, enroll CTA |
| `Login.tsx` | `/login` | Google OAuth + dev login button |
| `About.tsx` | `/about` | Company about page |
| `Contact.tsx` | `/contact` | Contact form/info |
| `Privacy.tsx` | `/privacy` | Privacy policy (bug: shows `new Date()` as "Last Updated") |
| `Terms.tsx` | `/terms` | Terms of service (bug: shows `new Date()` as "Last Updated") |
| `Checkout.tsx` | `/checkout/:id` | Razorpay modal flow (protected) |
| `Dashboard.tsx` | `/dashboard` | Enrolled courses + progress (protected) |
| `Learn.tsx` | `/learn/:id` | HLS video player + module nav + notes (protected) |
| `Profile.tsx` | `/profile` | User profile + certificate list (protected) |
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
| `ContentPage.tsx` | `/admin/content` | CMS editor (FAQs, testimonials, banners) |
| `CouponsPage.tsx` | `/admin/coupons` | Create/deactivate coupon codes |
| `ReviewsPage.tsx` | `/admin/reviews` | Moderate + delete course reviews |
| `AuditLogPage.tsx` | `/admin/audit` | Admin action log (created_at, action, entity, diff) |
| `SettingsPage.tsx` | `/admin/settings` | Site-wide settings (maintenance mode, featured course, etc.) |

**Routing:** HashRouter, `React.lazy()` for all protected/admin routes, `Suspense` with `PageLoader` fallback.

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
| `CourseCardSkeleton` | Shimmer loading placeholder for course cards |
| `CourseFilters` | Filter bar (type, price, rating) + sort dropdown |
| `SearchBar` | Debounced course search input |
| `HeroCarousel` | Auto-advancing hero with course cards |
| `AnnouncementBanner` | Top-of-page dismissable banner (from CMS settings) |

### Learning
| Component | Notes |
|-----------|-------|
| `VideoPlayer` | `videoId`, `moduleId`, `fallbackUrl`; exposes ref handle (play/pause/seek/quality/PiP); HLS.js + Bunny CDN; retry on error (3 attempts) |
| `VideoUploader` | Drag-drop TUS upload to Bunny; max 500MB; calls `admin-video-upload` Edge Function for credentials |
| `StarRating` | Controlled/uncontrolled star input |
| `ReviewForm` | Create/edit review (rating + comment) |
| `ReviewList` | Paginated review display with helpfulness votes |

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
| `useStorefrontFilters()` | `{filters, setFilter, resetFilters, filteredCourses}` | Course list filter + sort state |
| `useVideoPlayer(videoRef)` | `{isPlaying, currentTime, duration, volume, playbackRate, togglePlay, seek, ...}` | Video UI state abstraction over VideoPlayer ref |
| `useVideoUrl(videoId, fallbackUrl)` | `{videoUrl, hlsUrl, isLoading, error, refreshUrl}` | Immediately serves CDN URL; upgrades to signed URL in background; auto-refresh 5min before expiry |
| `useWishlist(courseId?)` | `{isSaved, toggle, wishlistIds, isLoading}` | Wishlist state; optimistic toggle; loads full list on mount |

---

## API Modules (13 total in `services/api/`)

| Module | Purpose |
|--------|---------|
| `courses.api.ts` | Course + module queries |
| `enrollments.api.ts` | Enrollment access + progress tracking |
| `progress.api.ts` | Module progress + completion logic |
| `checkout.api.ts` | Razorpay order creation + verification |
| `admin.api.ts` | Admin dashboard + CRUD |
| `notifications.api.ts` | User notifications |
| `payments.api.ts` | Payment history + refunds |
| `certificates.api.ts` | User certificates |
| `siteContent.api.ts` | CMS content |
| `reviews.api.ts` | Course reviews CRUD |
| `users.api.ts` | User profile operations |
| `coupons.api.ts` | Coupon validation |
| `wishlist.api.ts` | User wishlist (favorites) |

---

## Edge Functions (11 total in `supabase/functions/`)

| Function | Auth | Purpose |
|----------|------|---------|
| `admin-video-upload` | JWT + admin | Generate Bunny TUS upload credentials |
| `certificate-generate` | JWT | Generate PDF certificate + email |
| `checkout-create-order` | JWT | Create Razorpay order |
| `checkout-verify` | JWT | Verify Razorpay payment signature + create enrollment |
| `checkout-webhook` | **No JWT** (HMAC) | Razorpay webhook async fallback |
| `coupon-apply` | JWT | Atomic coupon validation via `apply_coupon` RPC |
| `progress-complete` | JWT | Mark module complete via `complete_module` RPC; trigger certificate |
| `refund-process` | JWT + admin | Initiate Razorpay refund + update records |
| `session-enforce` | JWT | Enforce session validity on login (3s timeout, lenient) |
| `video-cleanup` | JWT + admin | Delete video from Bunny after course module removal |
| `video-signed-url` | JWT | Generate SHA256 Bunny CDN signed URL (1hr expiry) |

Shared utilities in `supabase/functions/_shared/`: `cors.ts`, `auth.ts`, `response.ts`, `bunny.ts`, `resend.ts`

---

## Types Reference (`types/index.ts`)

**User:** `Role ('USER'|'ADMIN')`, `User {id, name, email, avatar, phone_e164, role, phoneVerified, emailVerified, google_id, created_at, last_login_at}`

**Course:** `CourseType ('BUNDLE'|'MODULE')`, `CourseStatus ('PUBLISHED'|'DRAFT')`, `Course {id, slug, title, description, price(paise), thumbnail, heroVideoId, type, status, rating, totalStudents, features[], chapters?, reviews?, bundledCourses?}`, `CourseWithModules extends Course`

**Module:** `Module {id, courseId, title, duration, durationSeconds, videoUrl, videoId(BunnyGUID), isFreePreview, orderIndex}`

**Enrollment:** `EnrollmentStatus ('ACTIVE'|'EXPIRED'|'REVOKED'|'PENDING')`, `Enrollment {id, userId, courseId, status, paymentId, orderId, amount, expiresAt, completedModules[], currentModule, overallPercent, totalWatchTime}`, `EnrollmentWithCourse extends Enrollment`

**Progress:** `Progress {userId, courseId, moduleId, timestamp, completed, completedAt, watchTime, viewCount}`, `ProgressStats {overallPercent, completedModules, totalModules, totalWatchTime, currentModule}`

**Payment:** `PaymentStatus ('pending'|'captured'|'refunded'|'failed')`, `PaymentOrder {orderId, amount, currency, key, courseTitle}`, `PaymentVerification {success, verified, enrollmentId}`

**Certificate:** `CertificateStatus ('ACTIVE'|'REVOKED')`, `Certificate {id, userId, courseId, certificateNumber, studentName, courseTitle, issueDate, completionDate, downloadUrl, status}`

**Admin:** `AdminStats {totalUsers, activeUsers, totalRevenue, totalCourses, totalEnrollments, totalCertificates}`, `SalesDataPoint {date, amount}`, `AdminUser (extended User)`, `CourseAnalytics {totalEnrollments, completionRate, avgWatchTimeMinutes, revenueTotal, activeStudents30d}`

**Other:** `SiteContentItem {id, section, title, body, metadata, orderIndex, isActive}`, `Coupon {code, discount_pct, max_uses, use_count, expires_at, is_active}`, `WishlistEntry {id, courseId, createdAt}`, `Review {id, userId, rating, comment, helpful}`, `ReviewSummary {total, averageRating, distribution{5,4,3,2,1}}`

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
1. **Privacy/Terms pages show `new Date()` as "Last Updated"** — renders today's date every render; should be a static string
2. **`getCourse()` has fragile `startsWith('c')` heuristic** — any slug starting with 'c' triggers wrong lookup path → "Course not found" error
3. **`reviews.api.ts` double-fetches** — second unbounded query fetches ALL reviews just to compute average rating; should use an RPC instead

### Security Gaps
4. **Dev credentials in production bundle** — `loginDev()` in `AuthContext` contains `admin@eyebuckz.com`/`dev-password-123`; visible in minified JS; must be tree-shaken behind `import.meta.env.DEV`
5. **No column-level RLS on `role`** — `users_update_own` policy allows updating the `role` column; a user could `UPDATE users SET role='ADMIN'`; fix: BEFORE UPDATE trigger blocking role changes
6. **PostgREST filter injection** — admin search interpolates user input into `.or()` string; crafted input could alter filter logic; fix: escape special characters before interpolation

### Tech Debt
7. **`types/supabase.ts` has stale `sessions`/`refresh_tokens` tables** — dropped during auth migration; regenerate via `/gen-db-types`
8. **No server state caching** — every navigation triggers full re-fetch; no deduplication or stale-while-revalidate; opportunity for TanStack Query
9. **No error boundaries around admin pages** — an admin page crash requires full page reload; fix: wrap `AdminLayout` outlet with `ErrorBoundary`

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
- `App.tsx` — Routes + providers (HashRouter)
- `index.css` — Tailwind v4 entry (`@import "tailwindcss"`) + `@theme {}` token block
- `services/supabase.ts` — Supabase client singleton
- `context/AuthContext.tsx` — Auth state management (Google OAuth + dev mode)
- `utils/analytics.ts` — PostHog wrapper (`track()`, `identify()`, `page()`)
- `supabase/migrations/` — **21 sequential SQL migrations (001-021)**; next = 022
- `supabase/functions/` — **11 Edge Functions** (see Edge Functions section above)
- `types/index.ts` — Business types (25+ interfaces/enums)
- `types/supabase.ts` — Auto-generated DB types (run `/gen-db-types` to refresh)

---

## Slash Commands (Skills)

44 custom skills in `.claude/skills/` for the full dev lifecycle. Type `/` in Claude Code to invoke.

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
| `/github-actions-claude` | Scaffold GitHub Actions workflow for Claude Code PR reviews |

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
| "set up GitHub Actions for Claude" / "CI review workflow" | `/github-actions-claude` |
| User edits any `supabase/migrations/*.sql` | Remind user to run `/rls-test` after |
| User edits any `components/*.tsx` | Remind user to run `npm run type-check` |

**Rule:** When the user's intent clearly maps to one of the above, invoke the skill proactively. Announce what you're doing ("Invoking /skill-name...") so the user understands the automation.

---

## Docs Directory

Comprehensive docs live in `/docs` — consult before writing new architecture or making structural decisions:

```
docs/
  architecture/
    SYSTEM_OVERVIEW.md    — Full tech stack + data flow diagrams
    DATABASE_SCHEMA.md    — All tables, columns, relationships, RLS policies
    SECURITY_MODEL.md     — Auth, RLS, payment security, URL signing
    ACCESS_CONTROL.md     — Route protection, role-based access matrix
  api/
    SERVICE_MODULES.md    — All 13 API modules with function signatures
    EDGE_FUNCTIONS.md     — All 11 Edge Functions + _shared utilities
  reference/
    COMPONENTS.md         — All components with props + usage examples
    DESIGN_SYSTEM.md      — CSS tokens + Tailwind v4 utility classes
    HOOKS.md              — All hooks with signatures + return values
    USER_FLOWS.md         — User journey diagrams
  guides/
    DEVELOPMENT_SETUP.md  — Local dev setup from scratch
    DEPLOYMENT.md         — CF Pages + Supabase deploy process
    TESTING.md            — Vitest config + writing tests
    ADMIN_PANEL.md        — Admin features + workflows
    TROUBLESHOOTING.md    — Common issues + fixes
  project/
    KNOWN_ISSUES.md       — Bugs, security concerns, tech debt tracker
```

Root docs: `README.md`, `CODING_STANDARDS.md`, `SECURITY_STANDARDS.md`, `CONTRIBUTING.md`, `SUPABASE_SETUP.md`
