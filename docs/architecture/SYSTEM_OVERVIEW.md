# Eyebuckz LMS - System Architecture Overview

> Last updated: March 6, 2026

> Target audience: new developers joining the project and architects evaluating the system design.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Data Flow - Key User Journeys](#data-flow---key-user-journeys)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [API Layer Design](#api-layer-design)
7. [Build & Deploy Pipeline](#build--deploy-pipeline)

---

## Tech Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4             |
| Routing          | React Router 7 (HashRouter)                                      |
| Backend          | Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions, Storage) |
| Payments         | Razorpay (order creation, verification, webhooks via Edge Functions) |
| Video Streaming  | Bunny.net Stream (HLS playback, signed URLs via Edge Function, TUS upload) |
| Email            | Resend (transactional email via Edge Function)                    |
| Frontend Deploy  | Cloudflare Pages                                                  |
| Backend Deploy   | Supabase (managed PostgreSQL, Edge Functions, Auth, Storage)      |
| Error Tracking   | Sentry                                                            |
| Charts           | Recharts                                                          |
| Icons            | Lucide React                                                      |
| Testing          | Vitest                                                            |
| Linting          | ESLint                                                            |

---

## System Architecture Diagram

```
+------------------------------------------------------------------+
|                        Browser (React SPA)                       |
|  React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7 |
+--------+----------+-------------+-------------+-----------------+
         |          |             |             |
         v          v             v             v
+--------+--+ +-----+------+ +---+----------+ +-+----------------+
| Supabase  | | PostgREST  | | Edge         | | Supabase         |
| Auth      | | (Direct DB | | Functions    | | Realtime         |
| (Google   | |  queries)  | | (Deno)       | | (WebSocket)      |
| OAuth)    | |            | |              | |                  |
+-----------+ +-----+------+ +---+----------+ +------------------+
                    |             |
                    v             |
         +----------+----------+  |
         |   PostgreSQL        |  |
         |   12 tables         |  |
         |   14 functions      |  |
         |   11 triggers       |  |
         |   49 RLS policies   |  |
         +---------------------+  |
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
     +--------+------+  +--------+------+  +---------+-----+
     | Razorpay API  |  | Bunny.net API |  | Resend API    |
     | (Payments)    |  | (Video Upload |  | (Email)       |
     |               |  |  + Signed     |  |               |
     | - Create order|  |    URLs)      |  | - Purchase    |
     | - Verify pay  |  |              |  |   confirmation|
     | - Webhooks    |  | - TUS upload |  | - Certificate |
     | - Refunds     |  | - HLS stream |  |   delivery    |
     +---------------+  +--------------+  +---------------+
```

### Request Flow Summary

```
Browser
  |
  |-- Auth requests ---------> Supabase Auth (Google OAuth, JWT issuance)
  |
  |-- Data reads/writes -----> PostgREST API --> PostgreSQL (filtered by RLS)
  |
  |-- Sensitive operations ---> Edge Functions (with service_role key)
  |     |-- checkout-create-order --> Razorpay API
  |     |-- checkout-verify -------> Razorpay API (HMAC verification)
  |     |-- checkout-webhook ------> (called BY Razorpay, no JWT required)
  |     |-- video-signed-url ------> Bunny.net CDN (token-signed HLS URLs)
  |     |-- admin-video-upload ----> Bunny.net API (TUS upload)
  |     |-- certificate-generate --> Supabase Storage (PDF)
  |     |-- progress-complete -----> Database + Resend API
  |     |-- refund-process --------> Razorpay API (refund initiation)
  |
  |-- Realtime subscriptions -> Supabase Realtime (WebSocket, notifications)
```

---

## Data Flow - Key User Journeys

### 1. Registration

```
User clicks "Sign in with Google"
  |
  v
Google OAuth consent screen
  |
  v
Supabase Auth receives OAuth callback
  |
  v
Supabase creates auth.users record + issues JWT
  |
  v
Database trigger fires: handle_new_user()
  |
  v
Auto-creates row in public.users table
  (name from Google profile, role = 'user', avatar URL)
  |
  v
Frontend receives session via AuthContext
  |
  v
User redirected to Storefront (or original page)
```

**Key details:**
- `index.tsx` intercepts the OAuth callback hash fragment before React mounts, ensuring the session is established before routing begins.
- `AuthContext.tsx` manages the global auth state, subscribes to `onAuthStateChange`, and exposes `user`, `session`, `isAdmin`, and `loading` to all components.
- The database trigger (`handle_new_user`) runs with `SECURITY DEFINER` privileges to bypass RLS during profile creation.

### 2. Purchase Flow

```
User browses courses on Storefront
  |
  v
Clicks "Enroll" on a course or bundle
  |
  v
Frontend calls Edge Function: checkout-create-order
  |  (sends: course_id or bundle_id, JWT token)
  |
  v
Edge Function creates Razorpay order via Razorpay API
  |  (uses server-side RAZORPAY_KEY_SECRET)
  |
  v
Returns order_id to frontend
  |
  v
Frontend opens Razorpay checkout modal (client-side SDK)
  |
  v
User completes payment in Razorpay
  |
  +---> Path A: Frontend verification (immediate)
  |       |
  |       v
  |     Frontend calls Edge Function: checkout-verify
  |       |  (sends: razorpay_order_id, payment_id, signature)
  |       |
  |       v
  |     Edge Function verifies HMAC signature
  |       |
  |       v
  |     Creates enrollment record(s) in database
  |       |
  |       v
  |     Sends confirmation email via Resend
  |       |
  |       v
  |     Frontend redirects to PurchaseSuccess page
  |
  +---> Path B: Webhook verification (fallback / async)
          |
          v
        Razorpay sends webhook to checkout-webhook Edge Function
          |  (no JWT required, Razorpay signature verification)
          |
          v
        Edge Function verifies webhook signature
          |
          v
        Creates/updates enrollment if not already created by Path A
```

**Key details:**
- Dual verification (frontend + webhook) ensures enrollment is created even if the user closes the browser after payment.
- Razorpay amounts are in paise (1/100 of a rupee). Conversion happens at the Edge Function layer.
- The `checkout-webhook` function is the only Edge Function that does NOT require JWT authentication.

### 3. Learning Flow

```
User navigates to Learn page (/learn/:courseId)
  |
  v
Frontend fetches course + modules via PostgREST
  |  (RLS ensures user has active enrollment)
  |
  v
User selects a module (video lesson)
  |
  v
Frontend calls Edge Function: video-signed-url
  |  (sends: video_id from module record, JWT token)
  |
  v
Edge Function generates token-signed Bunny.net HLS URL
  |  SHA256(tokenKey + path + expires) -> base64url token
  |  URL format: https://{cdn}/{guid}/playlist.m3u8?token=...&expires=...
  |
  v
VideoPlayer component receives signed URL
  |
  v
hls.js library loads HLS manifest + segments
  |  (adaptive bitrate streaming)
  |
  v
User watches video; progress auto-saved periodically
  |  (frontend calls PostgREST to upsert module_progress)
  |
  v
User completes module (reaches end or clicks "Mark Complete")
  |
  v
Frontend calls Edge Function: progress-complete
  |
  v
Edge Function marks module complete + checks course completion
  |  If all modules complete:
  |    -> Updates enrollment status to 'completed'
  |    -> Triggers certificate generation flow
```

**Key details:**
- Signed video URLs have a time-limited expiry to prevent URL sharing.
- `hls.js` is loaded on-demand (only on the Learn page) to minimize initial bundle size (523KB).
- Progress is saved as a percentage (0-100) per module, enabling resume functionality.

### 4. Certification Flow

```
All modules in a course marked complete
  |
  v
progress-complete Edge Function detects course completion
  |
  v
Calls certificate-generate Edge Function
  |
  v
Generates PDF certificate
  |  (user name, course title, completion date, unique certificate ID)
  |
  v
Uploads PDF to Supabase Storage (certificates bucket)
  |  (private bucket, 5MB limit, PDF only)
  |
  v
Creates certificate record in database
  |  (links user, course, storage path, certificate number)
  |
  v
Sends email notification via Resend
  |  (congratulations + certificate download link)
  |
  v
Certificate available on user's Profile and Dashboard
```

---

## Frontend Architecture

### Entry Point and Initialization

```
index.tsx
  |-- Intercepts OAuth hash fragment (before React mounts)
  |-- Calls supabase.auth.getSession() to restore session
  |-- Mounts <App /> into DOM
  |
  v
App.tsx
  |-- Wraps everything in <AuthProvider>
  |-- Defines <HashRouter> routes
  |-- <Layout> wraps all routes (sticky nav, mobile drawer, footer)
  |-- Protected routes use React.lazy() for code splitting
```

### Routing

React Router 7 with **HashRouter** is used for Cloudflare Pages SPA compatibility. Hash-based routing (`/#/dashboard`) avoids the need for server-side URL rewriting.

**Public routes:**
- `/` - Storefront (course catalog)

**Protected routes (lazy-loaded):**
- `/#/checkout/:courseId` - Checkout
- `/#/dashboard` - Dashboard
- `/#/learn/:courseId` - Learn (video player)
- `/#/profile` - Profile
- `/#/purchase-success` - PurchaseSuccess

**Admin routes (lazy-loaded, admin role required):**
- `/#/admin` - AdminLayout (wraps all admin sub-routes)
- `/#/admin/dashboard` - AdminDashboardPage
- `/#/admin/reviews` - ReviewsPage
- Additional admin pages under `pages/admin/`

### Code Splitting Strategy

```
Initial Load (Storefront)
  ~226 KB  app bundle
  ~ 68 KB  react vendor chunk
  ~173 KB  supabase vendor chunk
  ~ 29 KB  lucide-react icons
  -------------------------
  ~115 KB  total (gzipped)

On-Demand (per route)
  ~523 KB  hls.js       (Learn page only)
  ~349 KB  recharts     (Admin dashboard only)
  ~  ? KB  sentry       (error tracking)
```

### State Management

The application uses React's built-in state primitives with no external state library:

| Scope       | Mechanism         | Location                      |
| ----------- | ----------------- | ----------------------------- |
| Global auth | React Context     | `context/AuthContext.tsx`      |
| Admin panel | React Context     | `pages/admin/AdminContext`     |
| Page state  | `useState`        | Individual page components     |
| Server data | Direct fetch      | `services/api/*.api.ts`        |
| Realtime    | Supabase listener | `hooks/useRealtimeNotifications.ts` |

### Component Structure

```
components/
  Layout.tsx           # App shell: sticky nav, mobile drawer, footer
  VideoPlayer.tsx      # HLS video player (hls.js integration)
  VideoUploader.tsx    # Admin video upload (Bunny.net TUS)
  Badge.tsx            # Status/category pill with CSS token variants
  Button.tsx           # Accessible button with loading state + icon slots
  Input.tsx            # Labeled input with error/hint/icon pattern
  Card.tsx             # Surface container with header/footer slots
  index.ts             # Barrel export

hooks/
  useVideoUrl.ts               # Fetches signed video URLs
  useRealtimeNotifications.ts  # Supabase Realtime subscription

context/
  AuthContext.tsx       # Global auth state (user, session, isAdmin)

pages/
  Storefront.tsx        # Course catalog (public)
  Dashboard.tsx         # User dashboard (enrolled courses, progress)
  Learn.tsx             # Video learning page
  Profile.tsx           # User profile + certificates
  Checkout.tsx          # Razorpay checkout flow
  PurchaseSuccess.tsx   # Post-purchase confirmation
  admin/
    AdminLayout.tsx     # Admin shell (sidebar + content)
    AdminRoutes.tsx     # Admin sub-routing
    DashboardPage.tsx   # Admin analytics
    ReviewsPage.tsx     # Manage course reviews
    components/
      AdminSidebar.tsx  # Navigation sidebar
      StatusBadge.tsx   # Reusable status indicator
```

---

## Backend Architecture

### Database Schema

PostgreSQL managed by Supabase with 17 sequential migrations (`001` through `017`).

**Core tables (12):**

| Table              | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `users`            | User profiles (synced from auth.users)   |
| `courses`          | Course catalog (title, price, status)    |
| `modules`          | Course content modules (video_id, order) |
| `enrollments`      | User-course enrollment records           |
| `module_progress`  | Per-module completion tracking            |
| `payments`         | Payment transaction records              |
| `certificates`     | Generated certificate metadata           |
| `notifications`    | User notification inbox                  |
| `reviews`          | Course reviews and ratings               |
| `site_content`     | CMS-managed content blocks               |
| `bundles`          | Course bundles (multi-course packages)   |
| `bundle_courses`   | Bundle-to-course junction table          |

**Database functions (14):** Includes `is_admin()` for role checks, `handle_new_user()` for auth trigger, progress calculation helpers, and enrollment management functions.

**Triggers (11):** Auto-fire on inserts/updates for profile creation, progress recalculation, notification generation, and timestamp management.

**RLS policies (49):** Every table has Row Level Security enabled. Policies enforce:
- Users can only read/write their own data (enrollments, progress, certificates, notifications)
- Admins have full access via `is_admin()` function
- Public read access for courses, modules, site_content, and reviews
- No direct write access to payments (only via Edge Functions with service_role key)

### Auth

- **Provider:** Supabase Auth with Google OAuth
- **Token:** JWT with 1-hour expiry, automatic refresh rotation
- **Session:** Managed client-side by `@supabase/supabase-js`; `AuthContext` subscribes to `onAuthStateChange`
- **Admin detection:** `is_admin()` SQL function checks `users.role = 'admin'`; mirrored in `AuthContext.isAdmin`
- **Auth trigger:** `handle_new_user()` fires on `auth.users` INSERT, creates corresponding `public.users` row

### Edge Functions

10 Deno-runtime Edge Functions deployed to Supabase:

| Function               | Auth Required | External API     | Purpose                            |
| ---------------------- | ------------- | ---------------- | ---------------------------------- |
| `checkout-create-order`| Yes (JWT)     | Razorpay         | Create Razorpay payment order      |
| `checkout-verify`      | Yes (JWT)     | Razorpay         | Verify payment signature           |
| `checkout-webhook`     | **No**        | (called BY Razorpay) | Async payment confirmation     |
| `video-signed-url`     | Yes (JWT)     | Bunny.net        | Generate time-limited HLS URLs     |
| `admin-video-upload`   | Yes (JWT+Admin)| Bunny.net       | Upload video via TUS protocol      |
| `certificate-generate` | Yes (JWT)     | --               | Generate + store PDF certificate   |
| `progress-complete`    | Yes (JWT)     | Resend           | Mark module/course complete + email|
| `refund-process`       | Yes (JWT+Admin)| Razorpay        | Process payment refunds            |
| `session-enforce`      | Yes (JWT+Admin)| --              | Verify and enforce user session state |
| `video-cleanup`        | Yes (JWT+Admin)| Bunny.net       | Delete unused video assets         |

**Shared utilities** (`supabase/functions/_shared/`, 7 modules):
- `cors.ts` - CORS header management
- `auth.ts` - JWT verification helpers
- `response.ts` - Standardized JSON response builders
- `email.ts` - Resend email sending
- Additional helpers for logging, validation, and error handling

**Edge Function conventions:**
- Return JSON: `{ success: boolean, error?: string, ...data }`
- Use `getCorsHeaders(req)` for CORS
- Log errors as: `console.error('[FunctionName] Context:', error)`
- Import shared helpers from `../_shared/`

### Storage

- **Bucket:** `certificates` (private)
- **Access:** Only via signed URLs or service_role key
- **Constraints:** PDF files only, 5MB maximum size
- **Purpose:** Stores generated course completion certificates

### Scheduled Jobs

- **Enrollment expiration:** `pg_cron` job runs daily at 2:00 AM UTC
- **Purpose:** Marks expired enrollments (based on expiration date) as inactive
- **Defined in:** Migration `010_enrollment_expiration.sql`

---

## API Layer Design

### Service Module Architecture

All frontend data access flows through typed API modules in `services/api/`:

```
pages/components
       |
       v
  services/api/*.api.ts    <-- 12 typed modules
       |
       v
  @supabase/supabase-js    <-- PostgREST client
       |
       v
  Supabase PostgREST API   <-- Filtered by RLS at database level
```

### API Modules

| Module                  | Purpose                              |
| ----------------------- | ------------------------------------ |
| `courses.api.ts`        | Course + module queries              |
| `enrollments.api.ts`    | Enrollment access + progress tracking|
| `progress.api.ts`       | Module progress + completion logic   |
| `checkout.api.ts`       | Razorpay order creation + verification|
| `admin.api.ts`          | Admin dashboard queries + CRUD       |
| `notifications.api.ts`  | User notification inbox              |
| `payments.api.ts`       | Payment history + refunds            |
| `certificates.api.ts`   | User certificate retrieval           |
| `siteContent.api.ts`    | CMS content blocks                   |
| `reviews.api.ts`        | Course reviews CRUD                  |
| `users.api.ts`          | User profile operations              |
| `coupons.api.ts`        | Coupon validation                    |

### Security Model

```
Frontend (untrusted)
  |
  |-- Sends JWT with every request
  |
  v
PostgREST / Edge Functions
  |
  |-- PostgREST: RLS policies filter results based on JWT claims
  |-- Edge Functions: Verify JWT, then use service_role key for privileged ops
  |
  v
PostgreSQL (49 RLS policies enforce access control)
```

**Key principle:** The frontend is treated as entirely untrusted. All security enforcement happens at the database level (RLS) or in Edge Functions (server-side). There is no "authorization middleware" in frontend code -- RLS policies are the authorization layer.

---

## Build & Deploy Pipeline

### Development

```bash
npm run dev            # Vite dev server (port 3000, HMR)
npm run build          # Production build (TypeScript + Vite)
npm test               # Vitest test runner
npm run lint           # ESLint
npm run type-check     # TypeScript compiler check (no emit)
supabase db reset      # Reset local DB + apply all migrations + seed
supabase functions serve  # Local Edge Function development
```

### CI Pipeline (GitHub Actions)

```
Push / PR to main
  |
  +-- npm run lint          (ESLint)
  +-- npm run type-check    (TypeScript)
  +-- npm test              (Vitest)
  +-- npm audit             (Security audit)
  +-- npm run build         (Production build)
  |
  v
All checks pass --> Ready for deploy
```

### Frontend Deployment

```
Cloudflare Pages via Wrangler CLI
  |
  |-- Production:  eyebuckz.com       (project: eyebucks)
  |-- Development: dev.eyebuckz.com   (project: eyebucks-dev)
  |
  v
Deploy command:
  npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true

Maintenance mode:
  Deploy dist-maintenance/ directory instead of dist/
```

### Backend Deployment

```
Supabase CLI
  |
  |-- Migrations: supabase db push (applies pending migrations)
  |-- Functions:  supabase functions deploy <function-name>
  |-- Secrets:    supabase secrets set KEY=VALUE
  |
  v
Project ref: pdengtcdtszpvwhedzxn
```

### Environment Variables

**Frontend (public, VITE_ prefixed):**

| Variable                  | Purpose                    |
| ------------------------- | -------------------------- |
| `VITE_SUPABASE_URL`       | Supabase project URL       |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anonymous API key |
| `VITE_RAZORPAY_KEY_ID`    | Razorpay public key        |

**Backend (server secrets, set via `supabase secrets set`):**

| Secret                    | Used By                    |
| ------------------------- | -------------------------- |
| `RAZORPAY_KEY_ID`         | checkout-create-order      |
| `RAZORPAY_KEY_SECRET`     | checkout-verify, webhook   |
| `BUNNY_API_KEY`           | admin-video-upload         |
| `BUNNY_TOKEN_KEY`         | video-signed-url           |
| `BUNNY_LIBRARY_ID`        | admin-video-upload         |
| `BUNNY_CDN_HOSTNAME`      | video-signed-url           |
| `RESEND_API_KEY`          | progress-complete, email   |

---

## Quick Reference

### File Structure (Key Paths)

```
/
+-- index.tsx                    # Entry point (OAuth callback handling)
+-- App.tsx                      # Routes + providers
+-- components/                  # Shared UI components
+-- context/AuthContext.tsx       # Global auth state
+-- hooks/                       # Custom React hooks
+-- pages/                       # Route page components
|   +-- admin/                   # Admin panel pages + components
+-- services/
|   +-- supabase.ts              # Supabase client singleton
|   +-- api/                     # 12 typed API modules
+-- types/
|   +-- index.ts                 # Business types
|   +-- api.ts                   # Request/response types
|   +-- supabase.ts              # Auto-generated DB types
+-- utils/                       # Utility functions
+-- supabase/
|   +-- migrations/              # 17 SQL migrations (001-017)
|   +-- functions/               # 10 Edge Functions
|   |   +-- _shared/             # 7 shared utilities
|   +-- seed.sql                 # Seed data
+-- public/                      # Static assets
+-- dist-maintenance/            # Maintenance mode static page
```

### Adding New Features

| What                | Where                              | Notes                                      |
| ------------------- | ---------------------------------- | ------------------------------------------ |
| New API query       | `services/api/{domain}.api.ts`     | Add to barrel in `services/api/index.ts`   |
| New shared component| `components/{Name}.tsx`            | PascalCase filename                        |
| New hook            | `hooks/use{Name}.ts`               | camelCase with `use` prefix                |
| New page            | `pages/{Name}.tsx`                 | Add route in `App.tsx`                     |
| New admin page      | `pages/admin/{Name}Page.tsx`       | Add route in `AdminRoutes.tsx`             |
| New Edge Function   | `supabase/functions/{kebab-name}/` | Use `_shared/` helpers                     |
| New DB migration    | `supabase/migrations/{NNN}_{desc}.sql` | Next available number: 018            |
| New business type   | `types/index.ts`                   |                                            |
| New API type        | `types/api.ts`                     |                                            |
