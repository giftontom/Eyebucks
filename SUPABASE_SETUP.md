# Supabase Setup Guide - Eyebuckz LMS

## Overview

Eyebuckz uses Supabase as its complete backend: PostgreSQL database, Auth (Google OAuth), Row Level Security, Edge Functions, Realtime, and Storage.

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users (e.g., `ap-south-1` for India)
3. Note your project credentials from **Settings > API**:
   - Project URL (`VITE_SUPABASE_URL`)
   - Anon/public key (`VITE_SUPABASE_ANON_KEY`)
   - Service role key (for Edge Functions only)

---

## 2. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Verify
supabase --version
```

---

## 3. Link to Your Project

```bash
cd eyebuckz

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>
```

---

## 4. Run Migrations

The project has 21 sequential migrations in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: users, courses, modules, enrollments, progress, certificates |
| `002_functions.sql` | SQL functions: is_admin(), complete_module(), get_admin_stats(), etc. |
| `003_rls_policies.sql` | Row Level Security policies for all tables |
| `004_auth_trigger.sql` | Auto-create user profile on signup |
| `005_storage.sql` | Storage bucket configuration |
| `006_production_gaps.sql` | Reviews, notifications, payments, site_content, analytics |
| `007_bundle_courses.sql` | Bundle course support (bundle_courses table) |
| `008_schema_fixes.sql` | CHECK constraints, FK fixes, RLS tightening |
| `009_review_fixes.sql` | Review indexes, dropped legacy sessions/refresh_tokens tables |
| `010_enrollment_expiration.sql` | Enrollment expiry + pg_cron scheduled job |
| `011_increment_view_count.sql` | Atomic view count increment function |
| `012_set_bunny_video_urls.sql` | Bunny.net video URL migration |
| `013_coupons.sql` | Coupons + coupon_uses tables with atomic redemption RPC |
| `014_wishlists.sql` | Wishlists table with UNIQUE(user_id, course_id) constraint |
| `015_audit_logs.sql` | Audit log table for admin actions |
| `016_login_attempts.sql` | Login attempts table for auth audit trail |
| `017_progress_enhancements.sql` | Progress table enhancements (watch_time, view_count) |
| `018_notifications_realtime.sql` | Realtime publication for notifications table |
| `019_rls_additions.sql` | Additional RLS policies for new tables |
| `020_functions_update.sql` | Updated RPCs: apply_coupon, get_progress_stats |
| `021_audit_log.sql` | Audit log trigger functions and policies |

```bash
# Push migrations to remote Supabase
supabase db push

# Or reset and reseed (local dev only)
supabase db reset
```

---

## 5. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URIs:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback` (local dev)
4. In Supabase Dashboard: **Authentication > Providers > Google**
   - Enable Google provider
   - Enter Client ID and Client Secret

For local dev, set in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

---

## 6. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy checkout-create-order
supabase functions deploy checkout-verify
supabase functions deploy checkout-webhook
supabase functions deploy video-signed-url
supabase functions deploy admin-video-upload
supabase functions deploy certificate-generate
supabase functions deploy progress-complete
supabase functions deploy refund-process
```

### Set Edge Function Secrets

```bash
# Razorpay (payments)
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=xxxxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxxxx

# Bunny.net (video streaming)
supabase secrets set BUNNY_STREAM_API_KEY=xxxxx
supabase secrets set BUNNY_STREAM_LIBRARY_ID=xxxxx
supabase secrets set BUNNY_STREAM_CDN_HOSTNAME=xxxxx.b-cdn.net
supabase secrets set BUNNY_STREAM_TOKEN_KEY=xxxxx

# Resend (email)
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set RESEND_FROM_EMAIL=noreply@eyebuckz.com

# App config
supabase secrets set APP_URL=https://eyebuckz.com
supabase secrets set ADMIN_EMAILS=admin@eyebuckz.com
```

### Edge Function JWT Verification

| Function | `verify_jwt` | Reason |
|----------|-------------|--------|
| checkout-create-order | `true` | Requires authenticated user |
| checkout-verify | `true` | Requires authenticated user |
| checkout-webhook | `false` | Called by Razorpay (no user JWT) |
| video-signed-url | `true` | Requires authenticated user |
| admin-video-upload | `true` | Requires admin auth |
| certificate-generate | `true` | Requires authenticated user |
| progress-complete | `true` | Requires authenticated user |
| refund-process | `true` | Requires admin auth |

---

## 7. Frontend Environment

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Optional
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_MOCK_PAYMENT=true
VITE_DEBUG_MODE=true
```

---

## 8. Regenerate TypeScript Types

After schema changes, regenerate the auto-generated types:

```bash
supabase gen types typescript --project-id <project-ref> > types/supabase.ts
```

---

## 9. Local Development

### Start Local Supabase

```bash
supabase start
```

This starts local instances of:
- PostgreSQL (port 54322)
- Auth (port 54321)
- Studio GUI (port 54323)
- Edge Functions runtime

### Serve Edge Functions Locally

```bash
supabase functions serve
```

### Seed Data

The `supabase/seed.sql` file provides test data. It runs automatically with `supabase db reset`.

### Admin Access

In development mode, use the dev login to access admin features:
- Email: `admin@eyebuckz.com` (created by seed data with ADMIN role)
- The dev login bypasses Google OAuth for local testing

---

## 10. Razorpay Webhook Setup

1. In [Razorpay Dashboard](https://dashboard.razorpay.com/), go to **Settings > Webhooks**
2. Add webhook URL: `https://<project-ref>.supabase.co/functions/v1/checkout-webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Copy the webhook secret and set it:
   ```bash
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxxxx
   ```

---

## 11. Bunny.net Video Setup

1. Create a [Bunny.net](https://bunny.net/) account
2. Create a **Stream** library
3. Enable **Token Authentication** in library settings
4. Note:
   - API Key (from account settings)
   - Library ID (from library settings)
   - CDN Hostname (from library settings)
   - Token Authentication Key (from library security settings)
5. Set all values as Edge Function secrets (see step 6)

---

## Troubleshooting

### "Permission denied" on queries

RLS is blocking the request. Check:
- Is the user authenticated? (`supabase.auth.getUser()`)
- Does the RLS policy allow this operation for this user?
- Check policies in `supabase/migrations/003_rls_policies.sql`

### Edge Function returns 401

- Verify the `Authorization` header is being sent
- Check if the function has `verify_jwt = true` in config.toml
- For webhooks, ensure `verify_jwt = false`

### Migrations fail

- Check if tables already exist (use `IF NOT EXISTS`)
- Verify migration order (numbered sequentially)
- Check for type mismatches (e.g., UUID vs TEXT for IDs)

### Auth callback fails

- Verify redirect URLs in Google Cloud Console
- Check `additional_redirect_urls` in config.toml
- Ensure the OAuth callback is handled before React renders (see `index.tsx`)

---

**Last Updated:** February 27, 2026
