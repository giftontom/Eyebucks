# Eyebuckz LMS -- Development Setup Guide

A complete guide to setting up the Eyebuckz LMS project for local development.

**Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + Supabase (PostgreSQL, Auth, Edge Functions, RLS, Realtime, Storage)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Install](#2-clone-and-install)
3. [Environment Setup](#3-environment-setup)
4. [Local Supabase](#4-local-supabase)
5. [Dev Server](#5-dev-server)
6. [Dev Login](#6-dev-login)
7. [Running Edge Functions Locally](#7-running-edge-functions-locally)
8. [Tests](#8-tests)
9. [Linting and Formatting](#9-linting-and-formatting)
10. [IDE Setup](#10-ide-setup)
11. [Common Issues](#11-common-issues)

---

## 1. Prerequisites

Install the following before getting started:

| Tool | Minimum Version | Install |
|------|----------------|---------|
| **Node.js** | 18+ (22 LTS recommended) | [nodejs.org](https://nodejs.org/) or `brew install node` |
| **npm** | 9+ (ships with Node.js) | Included with Node.js |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) or `brew install git` |
| **Supabase CLI** | 1.100+ | See below |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) (required by Supabase local) |

### Install the Supabase CLI

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Verify installation
supabase --version
```

### Verify Docker is running

The Supabase local dev stack runs in Docker containers. Make sure Docker Desktop is started before proceeding.

```bash
docker info
```

---

## 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url> eyebuckz-lms
cd eyebuckz-lms

# Install dependencies
npm install
```

The project uses npm (not yarn or pnpm). The lockfile is `package-lock.json`.

---

## 3. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

### Required variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Local: `http://127.0.0.1:54321` / Remote: Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key | Local: printed by `supabase start` / Remote: Supabase Dashboard > Settings > API |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key ID | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) -- use a test-mode key for development |

### Optional variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application display name | `Eyebuckz` |
| `VITE_APP_URL` | Application base URL | `http://localhost:3000` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | Not set (Sentry disabled) |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement ID | Not set (analytics disabled) |
| `VITE_MOCK_PAYMENT` | Skip real Razorpay in development | `true` |
| `VITE_DEBUG_MODE` | Enable verbose console logging | `true` |
| `VITE_DEV_LOGIN` | Show dev login buttons on the Login page | `true` |

### Minimal `.env.local` for local Supabase development

```env
# Local Supabase (values printed by `supabase start`)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>

# Razorpay test key (or skip if using mock payments)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx

# Development helpers
VITE_MOCK_PAYMENT=true
VITE_DEBUG_MODE=true
VITE_DEV_LOGIN=true
```

> **Important:** Only `VITE_`-prefixed variables are exposed to the frontend. Server-side secrets (Razorpay secret, Bunny.net keys, Resend API key) are set separately via `supabase secrets set` -- see [Section 7](#7-running-edge-functions-locally).

---

## 4. Local Supabase

The project uses Supabase for its entire backend: PostgreSQL database with RLS, Auth (Google OAuth), Realtime, Storage, and Edge Functions.

### Start the local Supabase stack

```bash
supabase start
```

This pulls and starts Docker containers for PostgreSQL, GoTrue (Auth), PostgREST (API), Realtime, Storage, Studio, and more. The first run downloads images and takes a few minutes.

Once started, the CLI prints the local endpoints and keys:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
        anon key: eyJhbG...
service_role key: eyJhbG...
```

Copy the `anon key` value into your `.env.local` as `VITE_SUPABASE_ANON_KEY`.

### Apply migrations and seed data

```bash
supabase db reset
```

This command:
1. Drops and recreates the local database.
2. Runs all 12 SQL migrations in `supabase/migrations/` (001 through 012) -- creating tables, functions, RLS policies, auth triggers, storage buckets, and more.
3. Runs `supabase/seed.sql` to populate sample courses, modules, and reviews.

### Key local ports

| Service | Port | URL |
|---------|------|-----|
| **Supabase API** (PostgREST) | 54321 | `http://127.0.0.1:54321` |
| **PostgreSQL** | 54322 | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| **Supabase Studio** (GUI) | 54323 | `http://127.0.0.1:54323` |
| **Auth (GoTrue)** | Internal | Accessed via API URL |

### Supabase Studio

Open [http://127.0.0.1:54323](http://127.0.0.1:54323) for a full database GUI where you can:
- Browse and edit table data
- Run SQL queries
- Inspect RLS policies
- View Auth users
- Manage Storage buckets

### Stop Supabase

```bash
supabase stop
```

To stop and reset all data (removes Docker volumes):

```bash
supabase stop --no-backup
```

---

## 5. Dev Server

Start the Vite development server:

```bash
npm run dev
```

The app launches at [http://localhost:3000](http://localhost:3000).

Vite configuration highlights (from `vite.config.ts`):
- **Port:** 3000 (bound to `0.0.0.0` for network access)
- **Plugins:** `@tailwindcss/vite` (Tailwind CSS 4), `@vitejs/plugin-react`
- **Path alias:** `@/` maps to the project root
- **Code splitting:** Vendor chunks for React, Supabase, Recharts, HLS.js, Sentry, and Lucide icons

### Available npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run tests in watch mode (Vitest) |
| `npm run test:ui` | Run tests with Vitest browser UI |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run lint` | Run ESLint (zero warnings enforced) |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying files |
| `npm run type-check` | Run TypeScript compiler check (no emit) |

---

## 6. Dev Login

The project includes a development login mechanism that bypasses Google OAuth, allowing you to authenticate locally without configuring OAuth credentials.

### How it works

1. Set `VITE_DEV_LOGIN=true` in your `.env.local`.
2. Navigate to the Login page (`/#/login`).
3. Two additional buttons appear below the Google sign-in button: **"Login as User (Dev)"** and **"Login as Admin (Dev)"**.

### Dev accounts

| Button | Email | Role | Description |
|--------|-------|------|-------------|
| Login as User (Dev) | `test@example.com` | `USER` | Standard student account |
| Login as Admin (Dev) | `admin@eyebuckz.com` | `ADMIN` | Full admin dashboard access |

Both accounts use the password `dev-password-123` internally. The `loginDev` function in `context/AuthContext.tsx`:
1. Attempts `signInWithPassword` against local Supabase Auth.
2. If the user does not exist, it calls `signUp` to auto-create the account.
3. For admin login, it additionally sets `role = 'ADMIN'` on the user profile in the `users` table.

### Seed data

After running `supabase db reset`, the database is populated with:
- **4 courses**: A bundle masterclass and 3 individual module courses (Scripting, Cinematography, Editing)
- **Modules** with Bunny.net HLS video URLs
- **Reviews** with sample ratings

Users are created on-the-fly by the dev login (not in `seed.sql`), because Supabase Auth manages user accounts separately from the `users` table. An auth trigger (`004_auth_trigger.sql`) automatically creates a row in the `users` table when a new auth user signs up.

---

## 7. Running Edge Functions Locally

The project has 8 Edge Functions (Deno runtime) in `supabase/functions/`:

| Function | JWT Required | Purpose |
|----------|-------------|---------|
| `checkout-create-order` | Yes | Create a Razorpay payment order |
| `checkout-verify` | Yes | Verify Razorpay payment signature |
| `checkout-webhook` | **No** | Receive Razorpay webhook callbacks |
| `video-signed-url` | Yes | Generate Bunny.net signed video URLs |
| `admin-video-upload` | Yes | Handle admin video uploads to Bunny.net |
| `certificate-generate` | Yes | Generate course completion certificates |
| `progress-complete` | Yes | Mark module/course progress as complete |
| `refund-process` | Yes | Process payment refunds via Razorpay |

Shared utilities live in `supabase/functions/_shared/` (CORS, auth, response helpers, HMAC, email, Supabase admin client).

### Serve Edge Functions locally

```bash
supabase functions serve
```

This starts all Edge Functions on `http://127.0.0.1:54321/functions/v1/<function-name>`.

### Set local secrets

Edge Functions need server-side secrets that are not in `.env.local`. Create a `.env` file in the `supabase/` directory or pass them inline:

```bash
# Option 1: Create supabase/.env with secrets
cat > supabase/.env << 'EOF'
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
BUNNY_STREAM_API_KEY=your_bunny_api_key
BUNNY_STREAM_LIBRARY_ID=your_library_id
BUNNY_STREAM_CDN_HOSTNAME=vz-xxxxx.b-cdn.net
BUNNY_STREAM_TOKEN_KEY=your_token_key
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@eyebuckz.com
ADMIN_EMAILS=admin@eyebuckz.com
APP_URL=http://localhost:3000
EOF

# Option 2: Pass the env file when serving
supabase functions serve --env-file supabase/.env
```

> **Note:** If you only need frontend development and are using `VITE_MOCK_PAYMENT=true`, you may not need to run Edge Functions locally. The mock payment mode bypasses Razorpay calls entirely.

### Test an Edge Function with curl

```bash
# Get a JWT token first (from a dev login session in the browser DevTools > Application > Local Storage)
TOKEN="your-supabase-jwt-here"

# Call an Edge Function
curl -i \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "c1-masterclass"}' \
  http://127.0.0.1:54321/functions/v1/checkout-create-order
```

---

## 8. Tests

The project uses **Vitest** with **jsdom** environment and **Testing Library** for component/service tests.

### Configuration

Test configuration is in `vitest.config.ts`:
- **Environment:** jsdom (browser-like DOM for React component testing)
- **Globals:** enabled (`describe`, `it`, `expect` available without imports)
- **Setup file:** `src/__tests__/setup.ts` (mocks `matchMedia`, `IntersectionObserver`, `localStorage`, `sessionStorage`, imports `@testing-library/jest-dom` matchers)
- **Coverage provider:** V8
- **Path alias:** `@/` maps to project root

### Run tests

```bash
# Watch mode (re-runs on file changes)
npm test

# Run once and exit
npx vitest run

# With Vitest browser UI (visual test runner)
npm run test:ui

# With coverage report (text + JSON + HTML)
npm run test:coverage
```

### Test file locations

Tests live in `src/__tests__/` and follow this structure:

```
src/__tests__/
  setup.ts                          # Global test setup
  helpers/
    mockProviders.tsx                # Shared mock providers for tests
  hooks/
    useVideoUrl.test.ts             # Hook tests
  services/
    certificatesApi.test.ts         # API service tests
    checkoutApi.test.ts
    paymentsApi.test.ts
    reviewsApi.test.ts
```

### Writing a new test

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

---

## 9. Linting and Formatting

### ESLint

The project uses ESLint with TypeScript, React, React Hooks, JSX accessibility, and import ordering plugins. Configuration is in `.eslintrc.json`.

Key rules:
- Zero warnings enforced in CI (`--max-warnings 0`)
- `no-console` is a warning (except `console.warn`)
- `@typescript-eslint/no-explicit-any` is a warning
- Import order is enforced with group separation and alphabetical sorting
- React Hooks rules of hooks are errors; exhaustive deps is a warning
- JSX accessibility rules are warnings

```bash
# Check for linting issues
npm run lint

# Auto-fix what can be fixed
npm run lint:fix
```

### Prettier

Code formatting is managed by Prettier. Configuration is in `.prettierrc.json`:

| Setting | Value |
|---------|-------|
| Semi | `true` |
| Single quotes | `true` |
| Tab width | `2` |
| Trailing comma | `es5` |
| Print width | `100` |
| Arrow parens | `always` |
| End of line | `lf` |
| Bracket spacing | `true` |
| JSX single quotes | `false` |

```bash
# Format all files
npm run format

# Check formatting without modifying
npm run format:check
```

Prettier ignores files listed in `.prettierignore` (node_modules, dist, env files, coverage, markdown files).

### TypeScript type checking

```bash
npm run type-check
```

This runs `tsc --noEmit` against the project. The TypeScript config (`tsconfig.json`) targets ES2022, uses bundler module resolution, and excludes `server/`, `supabase/`, `node_modules/`, and `dist/` directories.

---

## 10. IDE Setup

### VS Code (Recommended)

The project includes recommended extensions in `.vscode/extensions.json`. When you open the project in VS Code, you will be prompted to install them.

**Essential extensions:**

| Extension | ID | Purpose |
|-----------|-----|---------|
| ESLint | `dbaeumer.vscode-eslint` | Inline lint errors |
| Prettier | `esbenp.prettier-vscode` | Auto-format on save |
| TypeScript Next | `ms-vscode.vscode-typescript-next` | Latest TS features |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Tailwind class autocomplete |
| Vitest Explorer | `vitest.explorer` | Run tests from the sidebar |

**Recommended additional extensions:**

| Extension | ID | Purpose |
|-----------|-----|---------|
| ES7+ React Snippets | `dsznajder.es7-react-js-snippets` | React component snippets |
| Auto Rename Tag | `formulahendry.auto-rename-tag` | Sync rename HTML/JSX tags |
| GitLens | `eamodio.gitlens` | Git blame and history inline |
| Error Lens | `usernamehw.errorlens` | Show errors inline on the line |
| Path Intellisense | `christian-kohler.path-intellisense` | File path autocomplete |
| Import Cost | `wix.vscode-import-cost` | Show import sizes inline |
| Todo Tree | `gruntfuggly.todo-tree` | Track TODOs across codebase |

### Recommended VS Code settings

Add these to your workspace `.vscode/settings.json` for the best experience:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*[:=]\\s*['\"]([^'\"]*)['\"]"]
  ]
}
```

---

## 11. Common Issues

### Port 3000 already in use

Another process is using port 3000. Either stop it or change the Vite port:

```bash
# Find and kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Or start Vite on a different port
npx vite --port 3001
```

### Supabase won't start

**Docker not running:**
```
Error: Cannot connect to the Docker daemon
```
Start Docker Desktop and try again.

**Ports already in use:**
```
Error: port 54321 is already in use
```
Another Supabase instance or service is using the ports. Stop it first:
```bash
supabase stop
supabase start
```

**Stale Docker state:**
```bash
# Nuclear option: stop and remove all Supabase containers/volumes
supabase stop --no-backup
supabase start
```

### Environment variables not working

- Make sure the file is named `.env.local` (not `.env`). Vite loads `.env.local` automatically.
- All frontend-accessible variables must be prefixed with `VITE_`.
- Restart the dev server after changing `.env.local` -- Vite does not hot-reload env changes.
- Check for typos: `VITE_SUPABASE_URL` not `VITE_SUPABASE_URL=` (no trailing spaces or invisible characters).

### Google OAuth not working in local dev

Google OAuth requires a redirect URL registered in the Google Cloud Console. For local development, you have two options:

**Option A (Recommended): Use dev login instead.**
Set `VITE_DEV_LOGIN=true` in `.env.local` and use the dev login buttons. No OAuth configuration needed.

**Option B: Configure Google OAuth locally.**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials.
2. Add `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as environment variables before starting Supabase (or in `supabase/config.toml`).
4. Restart Supabase: `supabase stop && supabase start`.

### "Invalid login credentials" on dev login

The dev login auto-creates users on first attempt. If it fails:
1. Confirm local Supabase is running (`supabase status`).
2. Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` match the values from `supabase start`.
3. Try resetting the database: `supabase db reset`.

### Supabase migrations fail on `db reset`

```bash
# Check migration status
supabase migration list

# If migrations are out of order, repair
supabase migration repair <version> --status applied
```

### Edge Functions not responding

1. Confirm they are running: `supabase functions serve` must be active in a terminal.
2. Check that secrets are set: Edge Functions crash silently if required env vars are missing.
3. Look at the terminal running `supabase functions serve` for error output.
4. Test directly with curl (see [Section 7](#7-running-edge-functions-locally)).

### TypeScript errors on `import type`

If you see errors about type-only imports, ensure you are using `import type {}` syntax for types:

```typescript
// Correct
import type { User } from '../types';

// Incorrect (may cause runtime import issues)
import { User } from '../types';
```

### Tailwind classes not applying

The project uses Tailwind CSS v4 via the `@tailwindcss/vite` plugin (not PostCSS). If classes are not working:
1. Verify `index.css` has `@import "tailwindcss"` at the top.
2. Restart the dev server -- Tailwind v4 requires a full rebuild after config changes.
3. Check that `@tailwindcss/vite` is in `devDependencies` (it should be).

### Tests fail with "Cannot find module"

The test config uses a separate `vitest.config.ts` with its own `@/` path alias. If imports fail:
1. Check that the alias in `vitest.config.ts` matches `vite.config.ts`.
2. Run `npm install` to ensure all test dependencies are present.

---

## Quick Start Checklist

```bash
# 1. Clone and install
git clone <repository-url> eyebuckz-lms && cd eyebuckz-lms
npm install

# 2. Start local Supabase (Docker must be running)
supabase start

# 3. Create .env.local (use anon key from step 2)
cp .env.example .env.local
# Edit .env.local: set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEV_LOGIN=true

# 4. Apply migrations and seed data
supabase db reset

# 5. Start the dev server
npm run dev

# 6. Open http://localhost:3000 and use "Login as Admin (Dev)" to explore
```

---

*Last updated: March 3, 2026*
