# Eyebuckz LMS -- Deployment Guide

> Last updated: March 21, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Frontend Deployment (Cloudflare Pages)](#3-frontend-deployment-cloudflare-pages)
4. [Backend Deployment (Supabase)](#4-backend-deployment-supabase)
5. [Environment Management](#5-environment-management)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Maintenance Mode](#7-maintenance-mode)
8. [Post-Deploy Verification](#8-post-deploy-verification)
9. [Rollback Procedures](#9-rollback-procedures)

---

## 1. Architecture Overview

```
                         +-------------------+
                         |     Browser       |
                         +--------+----------+
                                  |
                                  | HTTPS
                                  v
                  +-------------------------------+
                  |     Cloudflare Pages (CDN)     |
                  |   eyebuckz.com / dev.eyebuckz.com  |
                  |   Static SPA: React 19 + Vite  |
                  |   Security headers via _headers |
                  +-------------------------------+
                          |               |
             Supabase JS  |               |  Edge Function
             (PostgREST)  |               |  invocations
                          v               v
                  +-------------------------------+
                  |          Supabase              |
                  |  +----------+ +--------------+ |
                  |  | PostgreSQL| | Edge Functions| |
                  |  | (RLS)     | | (Deno)       | |
                  |  +----------+ +--------------+ |
                  |  +----------+ +--------------+ |
                  |  | Auth     | | Storage      | |
                  |  | (OAuth)  | | (Buckets)    | |
                  |  +----------+ +--------------+ |
                  +-------------------------------+
                          |               |
                          v               v
                  +-----------+   +-----------+
                  | Razorpay  |   | Bunny.net |
                  | (Payments)|   | (Video)   |
                  +-----------+   +-----------+
                          |
                          v
                  +-----------+
                  |  Resend   |
                  |  (Email)  |
                  +-----------+
```

**Data flow summary:**

- The browser loads the static SPA from Cloudflare Pages.
- The SPA communicates directly with Supabase via `@supabase/supabase-js` for auth, database queries, and realtime subscriptions.
- Server-side secrets (Razorpay, Bunny.net, Resend) are handled exclusively by Supabase Edge Functions.
- Row Level Security (RLS) on PostgreSQL enforces all data access rules -- the frontend has no authorization logic.

---

## 2. Prerequisites

### Required CLI Tools

| Tool | Install | Verify |
|------|---------|--------|
| **Node.js** (v20+) | [nodejs.org](https://nodejs.org) | `node --version` |
| **npm** | Included with Node.js | `npm --version` |
| **Wrangler CLI** | `npm install -g wrangler` | `wrangler --version` |
| **Supabase CLI** | `brew install supabase/tap/supabase` | `supabase --version` |
| **Git** | [git-scm.com](https://git-scm.com) | `git --version` |

### Account Access

- **Cloudflare** account with access to Pages projects (`eyebucks`, `eyebucks-dev`)
- **Supabase** project access (project ref: `pdengtcdtszpvwhedzxn`)
- **GitHub** repository access for CI/CD

### Authenticate CLIs

```bash
# Cloudflare -- opens browser for OAuth login
wrangler login

# Supabase -- interactive login (TTY)
supabase login

# Supabase -- non-interactive login (CI/CD or scripts)
supabase login --token <SUPABASE_ACCESS_TOKEN>
```

---

## 3. Frontend Deployment (Cloudflare Pages)

### 3.1 Build

```bash
# Install dependencies
npm ci

# Run quality checks before building
npm run lint
npm run type-check
npm test -- --run

# Build the production bundle
npm run build
```

This outputs static files to `dist/`. The Vite configuration (`vite.config.ts`) splits vendor bundles for optimal caching:

| Chunk | Contents |
|-------|----------|
| `vendor-react` | react, react-dom, react-router-dom |
| `vendor-supabase` | @supabase/supabase-js |
| `vendor-recharts` | recharts (admin only) |
| `vendor-hls` | hls.js (video player only) |
| `vendor-sentry` | @sentry/react |
| `vendor-icons` | lucide-react |

### 3.2 Deploy

**Production** (eyebuckz.com):

```bash
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
```

**Development** (dev.eyebuckz.com):

```bash
npx wrangler pages deploy dist --project-name eyebucks-dev --commit-dirty=true
```

The `--commit-dirty=true` flag allows deploying even when the git working tree has uncommitted changes.

### 3.3 Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings > Environment variables** for each project:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://pdengtcdtszpvwhedzxn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key | `eyJhbGciOiJI...` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay publishable key | `rzp_live_...` or `rzp_test_...` |

**Important:** These are `VITE_`-prefixed variables, meaning they are embedded into the client bundle at build time. They are public by design. Never put secrets here.

If you are building locally before deploying with Wrangler, these variables must be present in a `.env` file (or `.env.production`) at the project root at build time:

```bash
# .env.production
VITE_SUPABASE_URL=https://pdengtcdtszpvwhedzxn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

### 3.4 Custom Domain

Domains are configured in the Cloudflare Pages dashboard under **Custom domains**:

| Project | Domain |
|---------|--------|
| `eyebucks` | `eyebuckz.com` |
| `eyebucks-dev` | `dev.eyebuckz.com` |

Cloudflare automatically provisions SSL certificates and handles DNS when the domain is managed through Cloudflare DNS.

### 3.5 Security Headers

The file `public/_headers` is deployed alongside the SPA and tells Cloudflare Pages to serve these HTTP headers:

```
/index.html
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.b-cdn.net https://*.sentry.io; frame-src https://api.razorpay.com;
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Key caching rules:**

- `index.html` is never cached (`must-revalidate`) so users always get the latest app shell.
- Hashed assets under `/assets/*` are cached for 1 year (`immutable`) since filenames change on rebuild.

**Key security rules:**

- CSP restricts scripts to self and Razorpay checkout, connections to Supabase/Razorpay/Bunny CDN/Sentry.
- Clickjacking protection via `X-Frame-Options: DENY`.
- HSTS enforces HTTPS for 1 year including subdomains.

If you add a new external service (e.g., analytics), update the CSP directives in this file.

---

## 4. Backend Deployment (Supabase)

### 4.1 Link to Project

Before running any Supabase CLI commands, link your local directory to the remote project:

```bash
supabase link --project-ref pdengtcdtszpvwhedzxn
```

You will be prompted for the database password.

### 4.2 Database Migrations

Migrations live in `supabase/migrations/` and are numbered sequentially:

```
001_initial_schema.sql
002_functions.sql
003_rls_policies.sql
004_auth_trigger.sql
005_storage.sql
006_production_gaps.sql
007_bundle_courses.sql
008_schema_fixes.sql
009_review_fixes.sql
010_enrollment_expiration.sql
011_increment_view_count.sql
012_set_bunny_video_urls.sql
... (013 – 021 cover audit logs, login attempts, wishlists, coupons, notifications, admin search, etc.)
022_protect_role_column.sql     -- BEFORE UPDATE trigger blocking role self-promotion
023_get_review_summary_rpc.sql  -- get_review_summary() RPC replacing double-fetch
```

**26 migrations applied as of March 2026. Next migration number: 027.**

**Push pending migrations to production:**

```bash
supabase db push
```

This applies any migrations that have not yet been applied to the remote database. It runs them in order and records each one in the `supabase_migrations.schema_migrations` table.

**Verify migration status:**

```bash
supabase migration list
```

**Important:** Always test migrations on the development project first. Never run untested SQL directly against production.

### 4.3 Edge Functions

Eleven Edge Functions handle server-side logic:

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `admin-video-upload` | Bunny.net video upload for admins | Yes (admin) |
| `certificate-generate` | PDF certificate generation | Yes |
| `checkout-create-order` | Create Razorpay payment order | Yes |
| `checkout-verify` | Verify Razorpay payment signature | Yes |
| `checkout-webhook` | Razorpay webhook receiver | **No** (Razorpay calls it) |
| `coupon-apply` | Atomic coupon validation via RPC | Yes |
| `progress-complete` | Mark module/course progress | Yes |
| `refund-process` | Process payment refunds | Yes (admin) |
| `session-enforce` | Validate/enforce user session on login | Yes (`--no-verify-jwt`) |
| `video-cleanup` | Delete video from Bunny after module removal | Yes (admin) |
| `video-signed-url` | Generate signed Bunny.net HLS URLs | Yes (`--no-verify-jwt`) |

**Deploy all functions:**

```bash
supabase functions deploy
```

**Deploy a single function:**

```bash
supabase functions deploy <function-name>

# Examples:
supabase functions deploy checkout-verify
supabase functions deploy video-signed-url
```

Edge Functions use shared utilities from `supabase/functions/_shared/` (CORS, auth, response helpers, email). Changes to `_shared/` require redeploying all functions that import from it.

### 4.4 Secrets

Server-side secrets are set via the Supabase CLI. These are available as environment variables inside Edge Functions:

```bash
supabase secrets set RAZORPAY_KEY_SECRET=<value>
supabase secrets set RAZORPAY_KEY_ID=<value>
supabase secrets set BUNNY_API_KEY=<value>
supabase secrets set BUNNY_LIBRARY_ID=<value>
supabase secrets set BUNNY_CDN_HOSTNAME=<value>
supabase secrets set BUNNY_TOKEN_AUTH_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
```

**List currently set secrets:**

```bash
supabase secrets list
```

**Important:** Secrets are not version-controlled. Keep a secure record of all production secrets in your team's password manager.

---

## 5. Environment Management

### Two-Project Strategy

| Environment | Cloudflare Project | Domain | Supabase | Purpose |
|-------------|-------------------|--------|----------|---------|
| **Production** | `eyebucks` | eyebuckz.com | Production project | Live users |
| **Development** | `eyebucks-dev` | dev.eyebuckz.com | Dev/staging project | Testing |

### Mode Switching (Legacy)

The project includes a `switch-mode.sh` script for switching local `.env` files between development and production configurations:

```bash
# Switch to development mode
./switch-mode.sh dev

# Switch to production mode
./switch-mode.sh prod

# Check current mode
./switch-mode.sh status
```

This script copies `.env.development` or `.env.production` to `.env` for the frontend build. It is primarily useful when building locally before deploying with Wrangler.

### Deployment Sequence

The recommended order for deploying changes that touch both frontend and backend:

1. **Backend first** -- Push migrations, deploy functions, set secrets.
2. **Frontend second** -- Build with correct env vars and deploy to Cloudflare.

This ensures the frontend never references API endpoints or database structures that do not yet exist.

For **breaking backend changes** (e.g., removing a column the frontend still reads):

1. Deploy a new frontend version that no longer reads the old column.
2. Deploy the backend migration that removes the column.

---

## 6. CI/CD Pipeline

### GitHub Actions Workflow

The project has a CI workflow at `.github/workflows/ci.yml` that runs on pushes and pull requests to `main`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    name: Frontend Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test -- --run
      - run: npm audit --audit-level=high
      - run: npm run build
```

**What CI validates:**

- ESLint passes with zero warnings
- TypeScript compiles with no errors
- All Vitest tests pass
- No high-severity npm audit vulnerabilities
- Production build succeeds

### Current Deployment Model

Deployment is **manual** via Wrangler CLI after CI passes. There is no automated deployment pipeline (no CD step in the workflow).

**Recommended workflow:**

1. Open a PR against `main`.
2. CI runs automatically -- lint, type-check, tests, audit, build.
3. After code review and CI passes, merge to `main`.
4. Manually deploy using Wrangler CLI commands from Section 3.2.

### Adding Automated Deployment (Optional)

To add continuous deployment, you could extend the GitHub Actions workflow with a deploy job that runs only on pushes to `main`:

```yaml
  deploy:
    name: Deploy to Cloudflare Pages
    needs: frontend
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_RAZORPAY_KEY_ID: ${{ secrets.VITE_RAZORPAY_KEY_ID }}
      - run: npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

This requires adding `CLOUDFLARE_API_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_RAZORPAY_KEY_ID` as GitHub repository secrets.

---

## 7. Maintenance Mode

The project includes a pre-built maintenance page for use during extended downtime (major migrations, infrastructure changes, etc.).

### Maintenance Assets

The `dist-maintenance/` directory contains a self-contained static page:

- `index.html` -- Styled "Under Construction" page with the Eyebuckz branding
- `logo.svg` -- Eyebuckz logo

### Enable Maintenance Mode

Deploy the maintenance page in place of the main application:

```bash
# Deploy maintenance page to production
npx wrangler pages deploy dist-maintenance --project-name eyebucks --commit-dirty=true

# Or to development
npx wrangler pages deploy dist-maintenance --project-name eyebucks-dev --commit-dirty=true
```

### Disable Maintenance Mode

Rebuild the application and deploy normally:

```bash
npm run build
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
```

### When to Use Maintenance Mode

- Major database schema changes that require downtime
- Supabase project migrations or infrastructure updates
- Extended backend maintenance windows
- Emergency situations where the app needs to be taken offline

**Note:** For brief deployments (frontend-only changes), maintenance mode is unnecessary. Cloudflare Pages serves the new version atomically -- there is no downtime during a standard deploy.

---

## 8. Post-Deploy Verification

Run through this checklist after every production deployment:

### Frontend Checks

- [ ] **Site loads:** Visit `https://eyebuckz.com` and confirm the SPA renders without a blank screen.
- [ ] **Console errors:** Open browser DevTools and check for JavaScript errors or failed network requests.
- [ ] **Auth flow:** Sign in with Google OAuth. Confirm redirect back to the app and user profile loads.
- [ ] **Course listing:** Verify the storefront displays courses from the database.
- [ ] **Video playback:** Open a course module and confirm HLS video plays (tests `video-signed-url` Edge Function).
- [ ] **Checkout flow:** Attempt a test purchase or verify the Razorpay modal opens (tests `checkout-create-order` Edge Function).
- [ ] **Security headers:** Run `curl -I https://eyebuckz.com` and verify headers match `public/_headers`:
  ```bash
  curl -I https://eyebuckz.com | grep -E "(Content-Security-Policy|X-Frame-Options|Strict-Transport-Security)"
  ```

### Backend Checks

- [ ] **Migration status:** Run `supabase migration list` and confirm all migrations are applied.
- [ ] **Edge Function health:** Test a function endpoint directly:
  ```bash
  curl -X POST https://pdengtcdtszpvwhedzxn.supabase.co/functions/v1/video-signed-url \
    -H "Authorization: Bearer <user-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"videoId": "<test-video-id>"}'
  ```
- [ ] **Edge Function logs:** Check for errors in the Supabase dashboard under **Edge Functions > Logs**.
- [ ] **Database connectivity:** Open the Supabase dashboard SQL editor and run a quick query.

### Admin Checks

- [ ] **Admin panel:** Log in as an admin user and confirm the admin dashboard loads.
- [ ] **Admin data:** Verify admin dashboard shows correct stats (enrollments, revenue, etc.).
- [ ] **Video upload:** Test uploading a video through the admin interface (tests `admin-video-upload` Edge Function).

---

## 9. Rollback Procedures

### 9.1 Frontend Rollback (Cloudflare Pages)

Cloudflare Pages keeps a history of every deployment. To roll back:

**Via Cloudflare Dashboard:**

1. Go to **Cloudflare Dashboard > Pages > eyebucks > Deployments**.
2. Find the previous working deployment in the list.
3. Click the three-dot menu on that deployment and select **Rollback to this deploy**.
4. Confirm the rollback.

The rollback is instant -- Cloudflare switches the production URL to point at the previous build.

**Via Wrangler CLI:**

You can also redeploy a previous `dist/` if you have it locally:

```bash
# If you have the previous build checked out or saved
git checkout <previous-commit>
npm ci && npm run build
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
```

### 9.2 Backend Rollback (Supabase)

**Edge Functions:**

Edge Functions are stateless. To roll back, deploy the previous version of the function code:

```bash
git checkout <previous-commit> -- supabase/functions/<function-name>/
supabase functions deploy <function-name>
```

**Database Migrations:**

Supabase migrations are **forward-only** by design. There is no built-in `supabase db rollback` command.

To reverse a migration:

1. Write a new migration that undoes the changes:
   ```bash
   # Create a new migration file (next number: 013)
   touch supabase/migrations/013_revert_<description>.sql
   ```
2. In that file, write the inverse SQL (e.g., `DROP TABLE`, `ALTER TABLE DROP COLUMN`, restore old functions).
3. Apply it:
   ```bash
   supabase db push
   ```

**Critical point:** Always test rollback migrations on the development project before applying to production. Dropping columns or tables is destructive and data loss is permanent.

**Emergency database restore:**

Supabase maintains automatic daily backups (Pro plan). To restore from a backup:

1. Go to **Supabase Dashboard > Project Settings > Database > Backups**.
2. Select a backup point and restore.

This replaces the entire database state, so coordinate carefully with any frontend changes.

### 9.3 Coordinated Rollback

If a deployment broke both frontend and backend together:

1. Roll back the frontend first (Cloudflare dashboard -- instant).
2. Roll back Edge Functions to the matching commit.
3. If a database migration was applied, deploy a reversal migration.
4. Verify with the post-deploy checklist from Section 8.

---

## Quick Reference

### Common Commands

```bash
# ---------- Frontend ----------
npm run build                                                          # Build
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true   # Deploy prod
npx wrangler pages deploy dist --project-name eyebucks-dev --commit-dirty=true # Deploy dev

# ---------- Backend ----------
supabase link --project-ref pdengtcdtszpvwhedzxn                       # Link project
supabase db push                                                       # Apply migrations
supabase functions deploy                                              # Deploy all functions
supabase functions deploy <name>                                       # Deploy one function
supabase secrets set KEY=value                                         # Set a secret
supabase secrets list                                                  # List secrets
supabase migration list                                                # Check migration status

# ---------- Maintenance ----------
npx wrangler pages deploy dist-maintenance --project-name eyebucks --commit-dirty=true  # Enable
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true              # Disable

# ---------- Quality Checks ----------
npm run lint                                                           # ESLint
npm run type-check                                                     # TypeScript
npm test -- --run                                                      # Tests
```
