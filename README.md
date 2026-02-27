# Eyebuckz LMS - Learning Management System

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

**A modern LMS built with React, TypeScript, and Supabase.**

[Features](#features) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Deploy](#deploy)

</div>

---

## Features

**Students:** Course catalog, Razorpay payments, HLS video streaming (Bunny.net), progress tracking with auto-resume, personal notes, course completion certificates, real-time notifications.

**Admins:** Analytics dashboard, course & module CRUD, user management, certificate issuance, CMS content editor, revenue tracking, video uploads.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS, React Router 7 |
| Backend | Supabase (PostgreSQL, Auth, RLS, Realtime, Storage) |
| Edge Functions | Deno runtime (checkout, video signing, certificates, progress) |
| Payments | Razorpay (order creation, verification, webhooks) |
| Video | Bunny.net Stream (HLS, signed URLs, CDN) |
| Email | Resend (transactional emails) |
| Error Tracking | Sentry |
| Charts | Recharts |
| Icons | Lucide React |
| Deploy | Cloudflare Pages (frontend) + Supabase (backend) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local dev)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd eyebuckz
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# Start local Supabase (optional - for local development)
supabase start
supabase db reset   # runs migrations + seed

# Start frontend
npm run dev
```

**Access:** http://localhost:3000

**Dev accounts:** admin@eyebuckz.com / test@example.com (via dev login)

### Scripts

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm run preview        # Preview production build
npm test               # Run tests (Vitest)
npm run test:ui        # Tests with browser UI
npm run test:coverage  # Coverage report
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix lint issues
npm run format         # Prettier format
npm run type-check     # TypeScript check
```

---

## Architecture

### Project Structure

```
eyebuckz/
├── index.html                 # HTML entry
├── index.tsx                  # React entry (handles OAuth callback)
├── App.tsx                    # HashRouter, routes, providers
├── constants.ts               # App constants
│
├── components/                # Shared UI components (14)
│   ├── Layout.tsx             # App shell, nav, sidebar
│   ├── VideoPlayer.tsx        # HLS player (hls.js + Bunny.net)
│   ├── VideoUploader.tsx      # Admin video upload
│   ├── ErrorBoundary.tsx      # Error boundary
│   ├── ProtectedRoute.tsx     # Auth guard
│   ├── EnrollmentGate.tsx     # Enrollment access check
│   ├── NotificationBell.tsx   # Real-time notification UI
│   ├── SearchBar.tsx          # Course search
│   ├── CourseFilters.tsx      # Course filter controls
│   ├── ReviewForm.tsx         # Course review form
│   ├── ReviewList.tsx         # Course reviews display
│   ├── StarRating.tsx         # Star rating component
│   ├── Toast.tsx              # Toast notifications
│   └── CourseCardSkeleton.tsx # Loading skeleton
│
├── pages/                     # Route pages
│   ├── Storefront.tsx         # Course catalog (/)
│   ├── CourseDetails.tsx      # Course info (/course/:id)
│   ├── Checkout.tsx           # Payment flow (/checkout/:id)
│   ├── Dashboard.tsx          # User dashboard (/dashboard)
│   ├── Learn.tsx              # Video player + progress (/learn/:id)
│   ├── Profile.tsx            # User profile (/profile)
│   ├── Login.tsx              # Auth page (/login)
│   ├── PurchaseSuccess.tsx    # Post-payment (/success)
│   ├── Privacy.tsx            # Privacy policy (/privacy)
│   ├── Terms.tsx              # Terms of service (/terms)
│   └── admin/                 # Admin panel (/admin/*)
│       ├── AdminRoutes.tsx    # Admin route definitions
│       ├── AdminLayout.tsx    # Admin shell + sidebar
│       ├── AdminContext.tsx    # Admin state provider
│       ├── DashboardPage.tsx  # Admin analytics
│       ├── CoursesPage.tsx    # Course management
│       ├── CourseEditorPage.tsx # Course editor
│       ├── UsersPage.tsx      # User management
│       ├── UserDetailPage.tsx # User detail view
│       ├── CertificatesPage.tsx # Certificate management
│       ├── PaymentsPage.tsx   # Payment records
│       ├── ContentPage.tsx    # CMS content editor
│       └── components/        # Admin-specific components (12)
│
├── context/
│   └── AuthContext.tsx         # Supabase Auth (Google OAuth + dev mode)
│
├── hooks/
│   ├── useAccessControl.ts    # Enrollment access checks
│   ├── useRealtimeNotifications.ts  # Supabase Realtime subscription
│   ├── useScript.ts           # Dynamic script loading (Razorpay)
│   └── useVideoUrl.ts         # Bunny.net signed URL management
│
├── services/
│   ├── supabase.ts            # Supabase client singleton
│   ├── apiClient.ts           # API facade (backward compat)
│   ├── authService.ts         # Auth helpers
│   ├── enrollmentService.ts   # Enrollment helpers
│   ├── progressService.ts     # Progress helpers
│   └── api/                   # Typed Supabase query modules
│       ├── index.ts           # Barrel export
│       ├── courses.api.ts     # Course queries
│       ├── enrollments.api.ts # Enrollment queries
│       ├── progress.api.ts    # Progress tracking
│       ├── checkout.api.ts    # Payment Edge Function calls
│       ├── admin.api.ts       # Admin operations
│       ├── certificates.api.ts # Certificate queries
│       ├── notifications.api.ts # Notification queries
│       ├── payments.api.ts    # Payment records
│       └── siteContent.api.ts # CMS content queries
│
├── types/
│   ├── index.ts               # Business types (User, Course, Module, etc.)
│   ├── api.ts                 # API request/response types
│   └── supabase.ts            # Auto-generated DB types
│
├── utils/
│   ├── logger.ts              # Conditional logger (dev/prod)
│   └── dataExport.ts          # Data export utility
│
├── supabase/
│   ├── config.toml            # Supabase project config
│   ├── seed.sql               # Seed data
│   ├── migrations/            # 7 SQL migrations
│   │   ├── 001_initial_schema.sql     # Core tables
│   │   ├── 002_functions.sql          # PL/pgSQL functions
│   │   ├── 003_rls_policies.sql       # Row Level Security
│   │   ├── 004_auth_trigger.sql       # Auth user creation trigger
│   │   ├── 005_storage.sql            # Storage buckets
│   │   ├── 006_production_gaps.sql    # Reviews, notifications, payments, CMS
│   │   └── 007_bundle_courses.sql     # Bundle course support
│   └── functions/             # 7 Edge Functions (Deno)
│       ├── checkout-create-order/     # Create Razorpay order
│       ├── checkout-verify/           # Verify payment + enroll
│       ├── checkout-webhook/          # Razorpay webhook handler
│       ├── video-signed-url/          # Bunny.net signed URL generation
│       ├── admin-video-upload/        # Video upload to Bunny.net
│       ├── certificate-generate/      # Certificate PDF generation
│       └── progress-complete/         # Atomic module completion
│
└── src/__tests__/             # Test files (Vitest + jsdom)
```

### Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | Storefront | Public |
| `/login` | Login | Public |
| `/course/:id` | CourseDetails | Public |
| `/privacy` | Privacy | Public |
| `/terms` | Terms | Public |
| `/checkout/:id` | Checkout | Auth required |
| `/dashboard` | Dashboard | Auth required |
| `/learn/:id` | Learn | Auth required |
| `/profile` | Profile | Auth required |
| `/success` | PurchaseSuccess | Auth required |
| `/admin/*` | AdminRoutes | Auth required |

### Security Model

All data access is secured via Supabase Row Level Security (RLS):

- **Users** can only read/write their own data (enrollments, progress, certificates, notifications)
- **Admins** have full access via `is_admin()` SQL function
- **Edge Functions** use `service_role` key for privileged operations (payment processing, certificate generation)
- **Razorpay** HMAC signature verification in checkout-verify Edge Function
- **Video URLs** are signed server-side with time-limited tokens (Bunny.net)

---

## Environment Variables

### Frontend (.env)

```env
# Required
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Optional
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_MOCK_PAYMENT=true
VITE_DEBUG_MODE=true
```

### Supabase Edge Function Secrets

Set via `supabase secrets set`:

```
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
BUNNY_STREAM_API_KEY, BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_CDN_HOSTNAME, BUNNY_STREAM_TOKEN_KEY
RESEND_API_KEY, RESEND_FROM_EMAIL
ADMIN_EMAILS, APP_URL
```

---

## Database

**PostgreSQL via Supabase** with 7 sequential migrations:

**Core tables:** users, courses, modules, enrollments, progress, certificates, reviews, notifications, payments, site_content, bundle_courses

**Key functions:** `is_admin()`, `complete_module()`, `get_admin_stats()`, `get_progress_stats()`, `get_course_analytics()`, `update_course_rating()`

**Auth trigger:** Automatically creates user profile on Supabase Auth signup.

---

## Deploy

### Frontend (Cloudflare Pages)

1. Connect repository on Cloudflare Pages dashboard
2. Build settings: Framework preset `None`, build command `npm run build`, output directory `dist`
3. Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`)
4. Deploy (or push to trigger auto-deploy)

### Backend (Supabase)

1. Link project: `supabase link --project-ref <ref>`
2. Push migrations: `supabase db push`
3. Deploy functions: `supabase functions deploy`
4. Set secrets: `supabase secrets set KEY=value`

---

## Testing

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage report
npm run test:ui         # Browser-based test UI
```

Tests use Vitest with jsdom environment and React Testing Library.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and workflow.

See [CODING_STANDARDS.md](CODING_STANDARDS.md) for code style guidelines.

See [SECURITY_STANDARDS.md](SECURITY_STANDARDS.md) for security practices.

---

## License

MIT
