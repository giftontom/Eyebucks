# Eyebuckz LMS - Troubleshooting Guide

> **Last updated:** March 3, 2026
>
> Stack: React 19 + TypeScript 5.8 + Vite 6 + Supabase (PostgreSQL, Auth, Edge Functions) + Razorpay + Bunny.net Stream + Cloudflare Pages

---

## Table of Contents

1. [Authentication Issues](#1-authentication-issues)
2. [Database Issues](#2-database-issues)
3. [Edge Function Issues](#3-edge-function-issues)
4. [Video Issues](#4-video-issues)
5. [Payment Issues](#5-payment-issues)
6. [Build Issues](#6-build-issues)
7. [Deployment Issues](#7-deployment-issues)

---

## 1. Authentication Issues

### 1.1 Google OAuth callback fails

**Problem:** After clicking "Sign in with Google," the browser redirects but authentication never completes. The user sees a blank page or lands back on the login page.

**Cause:** The redirect URL configured in the Google Cloud Console does not match the Supabase Auth callback URL. Supabase expects the callback at `https://<project-ref>.supabase.co/auth/v1/callback`, and the post-login redirect goes to the frontend origin. If either URL is missing or mismatched, OAuth silently fails.

**Solution:**

1. Go to [Google Cloud Console > APIs & Credentials > OAuth 2.0 Client IDs](https://console.cloud.google.com/apis/credentials).
2. Under **Authorized redirect URIs**, ensure this URL is present:
   ```
   https://pdengtcdtszpvwhedzxn.supabase.co/auth/v1/callback
   ```
3. Under **Authorized JavaScript origins**, ensure all frontend origins are listed:
   ```
   https://eyebuckz.com
   https://www.eyebuckz.com
   https://dev.eyebuckz.com
   http://localhost:3000
   ```
4. In the Supabase Dashboard > Authentication > URL Configuration, verify:
   - **Site URL** matches your production frontend (e.g., `https://eyebuckz.com`)
   - **Redirect URLs** include all environments:
     ```
     http://localhost:3000
     http://localhost:5173
     https://eyebuckz.com
     https://eyebuckz.com/**
     https://www.eyebuckz.com
     https://www.eyebuckz.com/**
     https://dev.eyebuckz.com
     https://dev.eyebuckz.com/**
     ```
5. Confirm Google OAuth is enabled in Supabase Dashboard > Authentication > Providers > Google, with the correct `client_id` and `client_secret`.

**Note:** The frontend uses `window.location.origin` as the `redirectTo` value (see `context/AuthContext.tsx` line 121). This means the redirect destination changes per environment. All origins must be allowlisted in both Google Console and Supabase.

---

### 1.2 Session expired / 401 errors

**Problem:** The user is logged in but API calls fail with 401 Unauthorized, or the user sees "Your session has expired. Please log in again."

**Cause:** Supabase JWTs expire after 1 hour (configured as `jwt_expiry = 3600` in `supabase/config.toml`). If the refresh token rotation fails (e.g., the user's tab was idle for an extended period, or the refresh token was revoked), subsequent API calls send an expired JWT.

**Solution:**

1. **For users:** Log out and log back in. This clears stale tokens and establishes a fresh session.

2. **For developers investigating:** The codebase already handles this in several places:
   - `hooks/useVideoUrl.ts` proactively refreshes the session before calling Edge Functions (line 46) and retries once on 401 (lines 59-77).
   - `components/VideoUploader.tsx` detects auth errors via `isEdgeFnAuthError()` and retries after refresh (lines 120-134).
   - `utils/edgeFunctionError.ts` detects 401 responses and JWT-related error messages.

3. **If refresh tokens are consistently failing**, check:
   ```bash
   # Verify refresh token rotation is enabled
   grep -A2 "jwt_expiry" supabase/config.toml
   ```
   Expected output:
   ```toml
   jwt_expiry = 3600
   enable_refresh_token_rotation = true
   refresh_token_reuse_interval = 10
   ```

4. **If the issue persists across all users**, the Supabase JWT secret may have been rotated. Check the Supabase Dashboard > Settings > API > JWT Secret.

---

### 1.3 Dev login not working

**Problem:** Clicking "Dev Login" or "Admin Dev Login" on the login page throws an error or shows "Invalid login credentials."

**Cause:** Dev login uses Supabase email/password auth with hardcoded credentials (`admin@eyebuckz.com` / `test@example.com` with password `dev-password-123`). This requires:
- A running local Supabase instance (or a remote project with email auth enabled)
- Email signup enabled (at least for the initial account creation)
- Seed data loaded so that user profiles exist

**Solution:**

1. Start local Supabase and reset the database (loads migrations + seed data):
   ```bash
   supabase start
   supabase db reset
   ```

2. Verify the local Supabase is running:
   ```bash
   supabase status
   ```
   Confirm the API URL is `http://127.0.0.1:54321` and matches your `.env` or `.env.local`:
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-status>
   ```

3. Note that `supabase/config.toml` sets `[auth.email] enable_signup = false`. The `loginDev` function in `AuthContext.tsx` handles this by first attempting sign-in, and if that returns "Invalid login credentials," it falls back to `signUp()`. If signup is truly disabled on your Supabase instance, the dev user must already exist.

4. For the admin dev user, the code sets the role to `ADMIN` after login (line 173 of `AuthContext.tsx`). If the RLS policy prevents the user from updating their own role, the admin features will not appear. Check that the seed data includes an admin user or that you have a service-role override.

---

### 1.4 "User not found" after OAuth

**Problem:** Google OAuth succeeds (user is authenticated in Supabase Auth) but the app shows a blank state, "User not found," or the profile fails to load.

**Cause:** The `handle_new_user()` database trigger (migration `004_auth_trigger.sql`) is responsible for creating a row in the `public.users` table when a new `auth.users` row is inserted. If this trigger does not exist or fails silently, the auth user exists but has no corresponding profile row.

**Solution:**

1. Verify the trigger exists:
   ```sql
   -- Run in Supabase SQL Editor or psql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'users'
     AND event_object_schema = 'auth';
   ```
   You should see `on_auth_user_created` firing `handle_new_user()`.

2. If the trigger is missing, re-run the migration:
   ```bash
   # Local
   supabase db reset

   # Production - apply the specific migration manually
   # Copy the SQL from supabase/migrations/004_auth_trigger.sql
   # and run it in the Supabase SQL Editor
   ```

3. If the trigger exists but fails, check for schema mismatches. The trigger inserts into `public.users` with specific columns (`id`, `name`, `email`, `avatar`, `google_id`, `role`, `email_verified`, `last_login_at`). If later migrations altered the `users` table (added NOT NULL columns without defaults), the trigger insert will fail. Check the Supabase logs:
   ```bash
   # Local
   supabase logs --type postgres
   ```

4. As a manual fix for an existing user missing their profile:
   ```sql
   INSERT INTO public.users (id, name, email, role)
   SELECT id, raw_user_meta_data->>'full_name', email, 'USER'
   FROM auth.users
   WHERE id = '<user-uuid>'
   ON CONFLICT (id) DO NOTHING;
   ```

---

### 1.5 Profile not loading after sign up

**Problem:** A brand-new user signs up via Google OAuth, the login appears to succeed, but the profile data (name, avatar, role) is empty or missing. Refreshing the page fixes it.

**Cause:** Race condition. The `handle_new_user()` trigger runs asynchronously after the `auth.users` INSERT. The frontend receives the `SIGNED_IN` event and immediately queries `public.users`, but the trigger has not yet committed the profile row.

**Solution:**

The codebase already implements exponential-backoff retry logic in `AuthContext.tsx` (lines 94-101):

```typescript
const retryLoadProfile = async (userId: string, attempt = 0) => {
  const delays = [200, 400, 800, 1600, 3000];
  const result = await loadUserProfile(userId);
  if (!result && attempt < delays.length) {
    setTimeout(() => retryLoadProfile(userId, attempt + 1), delays[attempt]);
  }
};
```

If the profile still does not load:

1. Check the browser console for `[AuthContext] Failed to load user profile:` errors.
2. Verify the trigger is working (see section 1.4 above).
3. If the retry delays are not long enough (e.g., on a slow database), increase the delay values or add more retry attempts.
4. Check RLS policies on the `users` table. The user must be able to `SELECT` their own row:
   ```sql
   -- Verify the policy exists
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

---

## 2. Database Issues

### 2.1 "Permission denied" / RLS errors

**Problem:** Queries return empty results or throw `new row violates row-level security policy` errors, even though data exists in the table.

**Cause:** All tables have Row Level Security (RLS) enabled. Queries execute in the context of the authenticated user's JWT. If the JWT is missing, expired, or the RLS policy does not grant access for the operation, the query silently returns empty results (for SELECT) or throws an error (for INSERT/UPDATE/DELETE).

**Solution:**

1. **Verify the user is authenticated.** Check that the Supabase client is sending the JWT:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('JWT:', session?.access_token ? 'present' : 'MISSING');
   ```

2. **Check RLS policies for the table in question:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = '<table_name>';
   ```

3. **Common RLS issues:**

   - **User cannot read their own data:** Policy should use `auth.uid() = user_id`.
   - **Admin operations fail:** Verify the `is_admin()` function exists and works:
     ```sql
     -- Test admin check
     SELECT is_admin();
     ```
   - **Service role bypasses RLS:** Edge Functions using `supabase.createClient()` with the `service_role` key bypass RLS entirely. This is intentional for server-side operations like webhook processing.

4. **Debug locally** by temporarily checking what `auth.uid()` returns:
   ```sql
   -- In Supabase SQL Editor (when authenticated)
   SELECT auth.uid();
   ```

5. **If you added a new table**, ensure RLS is enabled and policies are created:
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can read own data" ON new_table
     FOR SELECT USING (auth.uid() = user_id);
   ```

---

### 2.2 Migration fails

**Problem:** Running `supabase db reset` or `supabase db push` fails with errors like "relation already exists," "type mismatch," or "column does not exist."

**Cause:** Migrations run sequentially (001 through 012). If a migration was manually altered after being applied, or if tables/columns were created out of order, subsequent migrations can conflict.

**Solution:**

1. **"relation already exists":** A previous migration or manual SQL already created the table. Add `IF NOT EXISTS`:
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   ```

2. **"column does not exist":** A migration references a column created by a later migration. Check the migration numbering (`supabase/migrations/`) and ensure dependencies are correct:
   ```
   001_initial_schema.sql      -- Base tables
   002_functions.sql            -- Database functions
   003_rls_policies.sql         -- RLS policies
   004_auth_trigger.sql         -- Auth trigger
   005_storage.sql              -- Storage buckets
   006_production_gaps.sql      -- Missing columns/fixes
   007_bundle_courses.sql       -- Bundle feature
   008_schema_fixes.sql         -- Schema corrections
   009_review_fixes.sql         -- Review system fixes
   010_enrollment_expiration.sql -- Expiration feature
   011_increment_view_count.sql -- View counting
   012_set_bunny_video_urls.sql -- Video URL migration
   ```

3. **Type mismatch:** Ensure the column type in the migration matches the existing schema. Common issue: `UUID` vs `TEXT` for IDs, or `INTEGER` vs `BIGINT`.

4. **Full reset (local only):**
   ```bash
   supabase db reset
   ```
   This drops all tables, re-runs all migrations in order, and applies `supabase/seed.sql`.

5. **Production fix:** Never run `db reset` on production. Instead, create a new migration to fix the issue:
   ```bash
   # Next migration number is 013
   touch supabase/migrations/013_fix_description.sql
   ```

---

### 2.3 Seed data not loading

**Problem:** After setting up the database, there are no courses, users, or test data available.

**Cause:** `supabase db push` only applies migrations -- it does not run `supabase/seed.sql`. Only `supabase db reset` applies both migrations and seed data.

**Solution:**

1. **Use `db reset` instead of `db push` for local development:**
   ```bash
   supabase db reset
   ```

2. **If you only want to re-seed without resetting:**
   ```bash
   # Connect to local Supabase and run seed manually
   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql
   ```

3. **If seed data fails with constraint violations**, the seed file may reference UUIDs or tables that do not exist yet. Check that all migrations have been applied first:
   ```bash
   supabase migration list
   ```

4. **For production:** Seed data is not applied to production. Use the Supabase Dashboard SQL Editor to insert initial data manually, or create an admin-facing import tool.

---

## 3. Edge Function Issues

### 3.1 401 Unauthorized from Edge Functions

**Problem:** Calling an Edge Function returns 401 Unauthorized before the function code even runs.

**Cause:** The Supabase gateway validates the JWT before forwarding the request to the Edge Function (when `verify_jwt = true` in `supabase/config.toml`). If the `Authorization: Bearer <token>` header is missing or the token is expired, the gateway returns 401 with `{"msg": "Invalid JWT"}`.

**Solution:**

1. **Verify the function's JWT setting** in `supabase/config.toml`:
   ```toml
   # Functions requiring authentication (most functions):
   [functions.video-signed-url]
   verify_jwt = true

   # Functions that must NOT require JWT (external webhooks):
   [functions.checkout-webhook]
   verify_jwt = false
   ```

2. **Ensure the Supabase client sends the JWT automatically.** When using `supabase.functions.invoke()`, the client attaches the session token. If the session is expired:
   ```typescript
   // Refresh before calling
   await supabase.auth.refreshSession();
   const { data, error } = await supabase.functions.invoke('my-function', { body: {...} });
   ```

3. **If testing manually with curl:**
   ```bash
   # Get your access token from the browser (Dev Tools > Application > Local Storage)
   curl -X POST \
     'https://pdengtcdtszpvwhedzxn.supabase.co/functions/v1/video-signed-url' \
     -H 'Authorization: Bearer <your-access-token>' \
     -H 'Content-Type: application/json' \
     -d '{"videoId": "test-id"}'
   ```

4. **The codebase detects JWT errors** using `isEdgeFnAuthError()` from `utils/edgeFunctionError.ts`, which checks for HTTP 401 status and message patterns like "Invalid JWT" or "jwt expired."

---

### 3.2 CORS errors

**Problem:** Browser console shows `Access to fetch at '...' from origin '...' has been blocked by CORS policy`.

**Cause:** The Edge Function's CORS headers do not include the requesting origin. The shared CORS utility (`supabase/functions/_shared/cors.ts`) maintains an explicit allowlist:

```typescript
const ALLOWED_ORIGINS = [
  'https://eyebuckz.com',
  'https://www.eyebuckz.com',
  'https://dev.eyebuckz.com',
  'http://localhost:3000',
  'http://localhost:5173',
];
```

It also allows Cloudflare Pages preview deployments matching `*.eyebucks(-dev)?.pages.dev`. If your origin does not match any of these, the function returns `Access-Control-Allow-Origin: https://eyebuckz.com` (the first allowed origin), causing the browser to block the response.

**Solution:**

1. **Add your origin to the allowlist** in `supabase/functions/_shared/cors.ts`:
   ```typescript
   const ALLOWED_ORIGINS = [
     'https://eyebuckz.com',
     'https://www.eyebuckz.com',
     'https://dev.eyebuckz.com',
     'http://localhost:3000',
     'http://localhost:5173',
     'http://localhost:XXXX',  // Add your port
   ];
   ```

2. **Redeploy the affected Edge Functions** after changing `_shared/cors.ts`:
   ```bash
   supabase functions deploy video-signed-url
   supabase functions deploy checkout-create-order
   supabase functions deploy checkout-verify
   # ... deploy all functions that use getCorsHeaders()
   ```

3. **Ensure every Edge Function handles OPTIONS preflight:**
   ```typescript
   import { getCorsHeaders } from '../_shared/cors.ts';

   Deno.serve(async (req) => {
     const corsHeaders = getCorsHeaders(req);

     // Handle CORS preflight
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: corsHeaders });
     }

     // ... function logic
     return new Response(JSON.stringify({ success: true }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   });
   ```

4. **Note on allowed methods:** The CORS config only allows `POST` and `OPTIONS`. If you need `GET` or other methods, update the `Access-Control-Allow-Methods` header in `getCorsHeaders()`.

---

### 3.3 Missing secrets

**Problem:** An Edge Function returns an error like "Missing RAZORPAY_KEY_SECRET" or a related message, or `Deno.env.get('SECRET_NAME')` returns `undefined`.

**Cause:** Edge Function secrets are set separately from frontend environment variables. They are not in `.env` files -- they are stored in Supabase's secrets vault.

**Solution:**

1. **Set secrets for production:**
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxx
   supabase secrets set RAZORPAY_KEY_SECRET=xxxxx
   supabase secrets set BUNNY_API_KEY=xxxxx
   supabase secrets set BUNNY_LIBRARY_ID=xxxxx
   supabase secrets set BUNNY_CDN_HOSTNAME=xxxxx
   supabase secrets set BUNNY_TOKEN_KEY=xxxxx
   supabase secrets set RESEND_API_KEY=re_xxxxx
   ```

2. **List current secrets (names only):**
   ```bash
   supabase secrets list
   ```

3. **For local development**, create a `.env.local` file in the `supabase/functions/` directory:
   ```bash
   # supabase/functions/.env.local
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   BUNNY_API_KEY=xxxxx
   BUNNY_LIBRARY_ID=xxxxx
   BUNNY_CDN_HOSTNAME=vz-xxxxx.b-cdn.net
   BUNNY_TOKEN_KEY=xxxxx
   RESEND_API_KEY=re_xxxxx
   ```

4. **Access secrets in Edge Function code:**
   ```typescript
   const apiKey = Deno.env.get('BUNNY_API_KEY');
   if (!apiKey) {
     return new Response(
       JSON.stringify({ success: false, error: 'Server configuration error' }),
       { status: 500 }
     );
   }
   ```

5. **Never commit secrets.** Ensure `supabase/functions/.env.local` is in `.gitignore`.

---

### 3.4 Function deployment fails

**Problem:** `supabase functions deploy <name>` fails with import errors, Deno compilation errors, or "function not found."

**Cause:** Edge Functions use the Deno runtime with its own module resolution. Common issues include: wrong import paths for `_shared/` helpers, importing Node.js-only modules, or missing the function directory structure.

**Solution:**

1. **Verify the function directory structure:**
   ```
   supabase/functions/
     _shared/
       cors.ts
       auth.ts
       ...
     my-function/
       index.ts       <-- Entry point (required)
   ```

2. **Use correct import paths for shared modules:**
   ```typescript
   // Correct - relative path from function directory
   import { getCorsHeaders } from '../_shared/cors.ts';

   // Wrong - these will fail in Deno
   import { getCorsHeaders } from '@shared/cors';
   import { getCorsHeaders } from '_shared/cors.ts';
   ```

3. **Use Deno-compatible imports:**
   ```typescript
   // Correct - use esm.sh or deno.land for npm packages
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   // Or use the Supabase-provided import map
   import { createClient } from 'jsr:@supabase/supabase-js@2';
   ```

4. **Test locally before deploying:**
   ```bash
   supabase functions serve my-function --env-file supabase/functions/.env.local
   ```

5. **If the function is new**, ensure it is listed in `supabase/config.toml` with the appropriate `verify_jwt` setting:
   ```toml
   [functions.my-new-function]
   verify_jwt = true
   ```

6. **Deploy a single function:**
   ```bash
   supabase functions deploy my-function
   ```

   **Deploy all functions:**
   ```bash
   supabase functions deploy
   ```

---

## 4. Video Issues

### 4.1 HLS playback fails

**Problem:** The video player shows a loading spinner indefinitely, displays "Failed to load video," or the HLS stream never starts.

**Cause:** Multiple possible causes:
- The signed URL has expired (URLs are time-limited).
- The Bunny.net CDN is unreachable or the video has not finished processing.
- `hls.js` failed to load (it is lazy-loaded only on the Learn page).
- The browser does not support HLS natively and `hls.js` initialization failed.

**Solution:**

1. **Check the browser console** for errors. Look for:
   - `Failed to fetch signed video URL:` -- the Edge Function call failed.
   - `hls.js` errors (manifest parsing, network errors).
   - 403/404 from `*.b-cdn.net` -- URL expired or invalid.

2. **Try refreshing the video URL.** The `useVideoUrl` hook exposes a `refreshUrl()` function and automatically schedules URL refresh 5 minutes before expiry (line 87-98 of `hooks/useVideoUrl.ts`).

3. **Verify the video exists in Bunny.net:**
   - Log into the Bunny.net Dashboard > Stream > Library.
   - Check that the video ID matches what is stored in the database.
   - Confirm the video status is "Finished" (not "Processing" or "Failed").

4. **Check Content Security Policy.** The `_headers` file must allow connections to Bunny CDN:
   ```
   connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.b-cdn.net https://*.sentry.io;
   ```
   If the CDN hostname is not `*.b-cdn.net`, update the CSP.

5. **hls.js not loading:** The library (523KB) is lazy-loaded. If code splitting fails, check the Vite build output:
   ```bash
   npm run build
   # Check dist/assets/ for the hls.js chunk
   ```

---

### 4.2 Video upload fails

**Problem:** Admin video upload gets stuck, shows "Upload failed," or the progress bar resets to 0%.

**Cause:** Video upload is a two-phase process:
1. **Phase 1:** The frontend calls the `admin-video-upload` Edge Function to get TUS credentials (video ID, library ID, auth signature, TUS endpoint).
2. **Phase 2:** The frontend uploads the file directly to Bunny.net via the TUS protocol.

Failures can occur in either phase.

**Solution:**

1. **Phase 1 failure (Edge Function):**
   - Check browser console for the specific error from `admin-video-upload`.
   - Verify the Bunny.net API key and Library ID secrets are set:
     ```bash
     supabase secrets list
     # Should include: BUNNY_API_KEY, BUNNY_LIBRARY_ID
     ```
   - The function requires admin authentication. Verify the user has `role = 'ADMIN'` in the database.

2. **Phase 2 failure (TUS upload):**
   - Check the browser console for `TUS upload error:` messages.
   - The upload uses the `tus-js-client` library with retry delays of `[0, 1000, 3000, 5000]` ms.
   - File size limit is 500MB (enforced client-side in `VideoUploader.tsx` line 39).
   - Allowed formats: MP4, MOV, AVI, WebM (line 40).

3. **Session expiry during long uploads:** Large uploads can take several minutes. If the JWT expires mid-upload, Phase 1 credentials remain valid (they use Bunny's own auth signature). But if the user navigates away and back, a new Phase 1 call will fail with 401. The uploader detects this and retries after refreshing the session.

4. **Network interruption:** TUS protocol supports resumable uploads. If the connection drops, the upload should resume automatically (based on the `retryDelays` config). If it does not, the user can remove the video and re-upload.

---

### 4.3 Signed URL 403

**Problem:** The video player loads but the HLS stream returns HTTP 403 Forbidden from `*.b-cdn.net`.

**Cause:** Bunny.net signed URLs use token authentication: `SHA256(tokenKey + path + expires)` encoded as base64url. A 403 means the token is invalid, expired, or generated with the wrong parameters.

**Solution:**

1. **Token expired:** Signed URLs have a limited lifetime. Check the `expiresAt` value returned by the `video-signed-url` Edge Function. The `useVideoUrl` hook schedules automatic refresh 5 minutes before expiry. If the user's tab was suspended (e.g., laptop sleep), the refresh timer may not have fired.
   - **Fix:** Call `refreshUrl()` or reload the page.

2. **Wrong CDN hostname:** The token is generated for a specific path on a specific CDN. If `BUNNY_CDN_HOSTNAME` does not match the actual CDN domain, the token is invalid.
   ```bash
   # Verify the secret matches your Bunny.net Stream CDN hostname
   supabase secrets list
   # BUNNY_CDN_HOSTNAME should be something like: vz-xxxxxxxx-xxx.b-cdn.net
   ```

3. **Token key mismatch:** The `BUNNY_TOKEN_KEY` must match the token authentication key configured in Bunny.net Dashboard > Stream > Security.
   ```bash
   supabase secrets set BUNNY_TOKEN_KEY=<key-from-bunny-dashboard>
   ```
   After updating, redeploy the Edge Function:
   ```bash
   supabase functions deploy video-signed-url
   ```

4. **Debug the signed URL:** Decode the URL and check its components:
   ```
   https://<cdn-hostname>/<video-guid>/playlist.m3u8?token=<base64url>&expires=<timestamp>
   ```
   - Verify `expires` is in the future (Unix timestamp in seconds).
   - Verify the `cdn-hostname` matches `BUNNY_CDN_HOSTNAME`.

---

## 5. Payment Issues

### 5.1 Razorpay order creation fails

**Problem:** Clicking "Buy Now" or "Enroll" throws an error, and no Razorpay checkout modal appears.

**Cause:** The `checkout-create-order` Edge Function calls the Razorpay API to create an order. Common failures:
- Wrong or missing Razorpay API keys.
- Amount sent in rupees instead of paise (Razorpay expects paise).
- Course not found or has no price set.

**Solution:**

1. **Verify Razorpay secrets:**
   ```bash
   supabase secrets list
   # Must include: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
   ```

2. **Test vs Live keys:** Ensure you are using the correct key pair for your environment:
   - Test keys start with `rzp_test_`
   - Live keys start with `rzp_live_`

3. **Amount in paise:** Razorpay expects amounts in the smallest currency unit. For INR, 1 rupee = 100 paise. If the database stores prices in rupees, the Edge Function must multiply by 100:
   ```typescript
   // Correct
   amount: course.price * 100  // 499 rupees = 49900 paise

   // Wrong - this creates an order for 4.99 rupees
   amount: course.price
   ```

4. **Check the Edge Function logs:**
   ```bash
   # Local
   supabase functions serve checkout-create-order --env-file supabase/functions/.env.local

   # Production - check Supabase Dashboard > Edge Functions > checkout-create-order > Logs
   ```

5. **Verify the frontend Razorpay key** matches the backend key:
   ```env
   # .env or .env.local
   VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
   ```
   This must be the same key ID (not secret) set in `supabase secrets set RAZORPAY_KEY_ID=...`.

---

### 5.2 Payment verification fails

**Problem:** The Razorpay checkout modal completes, but the verification step fails with "Payment verification failed" or an HMAC signature error.

**Cause:** After the user pays, the frontend sends `orderId`, `paymentId`, and `signature` to the `checkout-verify` Edge Function. The function computes `HMAC-SHA256(orderId + "|" + paymentId, secret)` and compares it to the provided signature. Mismatches occur when:
- The `RAZORPAY_KEY_SECRET` on the server does not match the Razorpay Dashboard.
- The `orderId` or `paymentId` values are corrupted or swapped.
- Test payments are verified against live keys or vice versa.

**Solution:**

1. **Verify the key secret matches:** Log into the [Razorpay Dashboard](https://dashboard.razorpay.com/) > Settings > API Keys and confirm the secret matches what is set in Supabase:
   ```bash
   supabase secrets set RAZORPAY_KEY_SECRET=<exact-secret-from-dashboard>
   supabase functions deploy checkout-verify
   ```

2. **Check that test/live modes are consistent:** The `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must both be from the same mode (test or live). Mixing them causes signature mismatches.

3. **Check the function logs** for the specific error:
   ```
   console.error('[checkout-verify] Context:', error)
   ```
   In the Supabase Dashboard > Edge Functions > checkout-verify > Logs.

4. **Verify the frontend sends all required fields** (`checkout.api.ts` line 49):
   ```typescript
   await supabase.functions.invoke('checkout-verify', {
     body: { orderId, paymentId, signature, courseId },
   });
   ```

---

### 5.3 Webhook not received

**Problem:** Razorpay shows the payment as captured, but the `checkout-webhook` Edge Function never runs and no enrollment is created via webhook.

**Cause:** Razorpay webhooks must be configured in the Razorpay Dashboard to point to the correct Edge Function URL. The webhook function must have `verify_jwt = false` because Razorpay cannot send a Supabase JWT.

**Solution:**

1. **Verify `verify_jwt = false`** in `supabase/config.toml`:
   ```toml
   [functions.checkout-webhook]
   verify_jwt = false  # Webhooks come from Razorpay, no JWT
   ```

2. **Configure the webhook URL** in Razorpay Dashboard > Settings > Webhooks:
   ```
   https://pdengtcdtszpvwhedzxn.supabase.co/functions/v1/checkout-webhook
   ```

3. **Select the correct events:** At minimum, enable:
   - `payment.captured`
   - `payment.failed`

4. **Set the webhook secret** in Razorpay and in Supabase secrets:
   ```bash
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=<webhook-secret-from-razorpay>
   ```

5. **Test the webhook locally:**
   ```bash
   # Serve the function locally without JWT verification
   supabase functions serve checkout-webhook --no-verify-jwt --env-file supabase/functions/.env.local

   # Send a test webhook
   curl -X POST http://127.0.0.1:54321/functions/v1/checkout-webhook \
     -H 'Content-Type: application/json' \
     -d '{"event": "payment.captured", "payload": {...}}'
   ```

6. **Check Razorpay's webhook delivery logs:** Razorpay Dashboard > Settings > Webhooks > Recent Deliveries. Look for HTTP status codes and response bodies.

---

### 5.4 Enrollment not created after payment

**Problem:** Payment succeeds (money is deducted) but the user does not see the course in their dashboard. No enrollment record exists.

**Cause:** Enrollment creation happens in two places:
1. **`checkout-verify`**: Called by the frontend immediately after payment. Creates enrollment synchronously.
2. **`checkout-webhook`**: Called by Razorpay asynchronously. Acts as a backup.

If both fail, the enrollment is never created.

**Solution:**

1. **Check the `checkout-verify` Edge Function logs** for errors. This is the primary enrollment path.

2. **Check the `checkout-webhook` logs** for backup enrollment.

3. **Manually verify enrollment exists:**
   ```sql
   SELECT * FROM enrollments WHERE order_id = '<razorpay-order-id>';
   ```

4. **If the payment exists but enrollment does not, create it manually:**
   ```sql
   INSERT INTO enrollments (user_id, course_id, order_id, enrolled_at)
   VALUES ('<user-uuid>', '<course-uuid>', '<razorpay-order-id>', now());
   ```

5. **Check `checkOrderStatus`** in `checkout.api.ts` -- the frontend polls for enrollment status after payment. If the enrollment row exists but the frontend does not show it, the issue may be in the query or RLS policies on the `enrollments` table.

6. **For bundles:** If the course is part of a bundle, check for `bundleWarning` and `failedCourseIds` in the verify response. Some courses in the bundle may have failed to enroll.

---

## 6. Build Issues

### 6.1 TypeScript errors

**Problem:** `npm run type-check` fails with type errors in files you did not modify, or errors reference `server/` or `supabase/` files.

**Cause:** The `tsconfig.json` is configured to exclude certain directories. If the exclude list is wrong or if imports pull in excluded files, TypeScript will report errors.

**Solution:**

1. **Verify `tsconfig.json` excludes are correct:**
   ```json
   {
     "exclude": ["server", "supabase", "node_modules", "dist"]
   }
   ```

2. **Use `import type` for type-only imports** to avoid pulling in runtime code from excluded directories:
   ```typescript
   // Correct
   import type { Database } from '../types/supabase';

   // Wrong - may pull in the full module
   import { Database } from '../types/supabase';
   ```

3. **Regenerate Supabase types** if the database schema has changed:
   ```bash
   supabase gen types typescript --local > types/supabase.ts
   # Or for production:
   supabase gen types typescript --project-id pdengtcdtszpvwhedzxn > types/supabase.ts
   ```

4. **If errors are in `node_modules`**, add `"skipLibCheck": true` to `compilerOptions` (already set in this project).

5. **Run type checking:**
   ```bash
   npm run type-check
   ```

---

### 6.2 Vite build fails

**Problem:** `npm run build` fails with errors like "process is not defined," missing environment variables, or unresolved imports.

**Cause:** Vite replaces `import.meta.env.VITE_*` variables at build time. If variables are missing, they become `undefined`. Node.js globals like `process` are not available in the browser.

**Solution:**

1. **Ensure all required env vars are set** in `.env` or `.env.production`:
   ```env
   VITE_SUPABASE_URL=https://pdengtcdtszpvwhedzxn.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
   ```

2. **Only `VITE_`-prefixed variables are exposed** to the frontend. Non-prefixed variables are not available:
   ```typescript
   // Works
   import.meta.env.VITE_SUPABASE_URL

   // undefined - not prefixed with VITE_
   import.meta.env.SUPABASE_URL

   // Not available in Vite - use import.meta.env instead
   process.env.VITE_SUPABASE_URL
   ```

3. **Missing dependency:** If a module import fails:
   ```bash
   npm install
   # Or for a specific package
   npm install <package-name>
   ```

4. **Check the Vite build output for chunk sizes:**
   ```bash
   npm run build
   ```
   If a chunk is unexpectedly large, check for unintended imports (e.g., importing the full `lodash` instead of `lodash-es`).

---

### 6.3 Tailwind CSS v4 issues

**Problem:** Tailwind classes are not applied, styles are missing, or the build fails with CSS errors referencing `@tailwind` directives.

**Cause:** This project uses **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`). Tailwind v4 uses a new CSS-first configuration approach that is incompatible with v3 syntax.

**Solution:**

1. **Use the correct CSS syntax.** The entry file (`index.css`) must use:
   ```css
   /* Correct - Tailwind v4 */
   @import "tailwindcss";

   @theme {
     --color-brand-500: #ef4444;
     /* ... custom theme values */
   }
   ```

   **Not** the old v3 syntax:
   ```css
   /* Wrong - Tailwind v3 (will not work) */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

2. **Ensure the Vite plugin is configured** in `vite.config.ts`:
   ```typescript
   import tailwindcss from '@tailwindcss/vite';

   export default defineConfig({
     plugins: [
       react(),
       tailwindcss(),
     ],
   });
   ```

3. **No `tailwind.config.js` needed.** Tailwind v4 uses the `@theme` block in CSS for customization. If a `tailwind.config.js` exists, it may conflict.

4. **Custom colors use CSS custom properties.** To reference brand colors:
   ```html
   <!-- Uses --color-brand-600 defined in @theme -->
   <div class="bg-brand-600 text-white">...</div>
   ```

5. **If upgrading from v3 to v4**, remove the old config file and CDN Play script, then convert all theme customizations to `@theme` CSS custom properties.

---

## 7. Deployment Issues

### 7.1 Cloudflare Pages build fails

**Problem:** The Cloudflare Pages deployment fails during the build step.

**Cause:** Cloudflare Pages runs the build in its own environment. Missing environment variables, wrong Node.js version, or missing dependencies can cause failures.

**Solution:**

1. **Set environment variables** in Cloudflare Dashboard > Pages > eyebucks > Settings > Environment Variables:
   ```
   VITE_SUPABASE_URL = https://pdengtcdtszpvwhedzxn.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   VITE_RAZORPAY_KEY_ID = rzp_live_xxxxx
   NODE_VERSION = 20
   ```

2. **Set both Production and Preview variables.** Cloudflare Pages has separate environment variable sets for production and preview deployments.

3. **Specify Node.js version:** Add `NODE_VERSION=20` (or higher) as an environment variable. The default may be too old for Vite 6.

4. **Build command and output directory:**
   ```
   Build command: npm run build
   Output directory: dist
   ```

5. **If deploying manually with Wrangler:**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true
   ```

6. **For the dev environment:**
   ```bash
   npx wrangler pages deploy dist --project-name eyebucks-dev --commit-dirty=true
   ```

---

### 7.2 SPA routing 404s

**Problem:** Navigating directly to a URL like `https://eyebuckz.com/dashboard` returns a 404 Not Found page.

**Cause:** This project uses `HashRouter`, so all routes are hash-based (e.g., `https://eyebuckz.com/#/dashboard`). Direct URL access without the hash prefix will hit the server, which only serves `index.html` at the root path.

**Solution:**

1. **HashRouter already handles this.** All routes are under the `#` fragment, so the server always serves `index.html` and the client-side router takes over. URLs look like:
   ```
   https://eyebuckz.com/#/            (home)
   https://eyebuckz.com/#/dashboard   (dashboard)
   https://eyebuckz.com/#/learn/xyz   (learn page)
   https://eyebuckz.com/#/admin       (admin panel)
   ```

2. **If users share links without the hash**, they will get 404s. This is expected with HashRouter.

3. **The `_headers` file** (`public/_headers`) is already configured with proper caching and security headers for Cloudflare Pages. It does not handle SPA routing redirects because HashRouter makes them unnecessary.

4. **If you switch to `BrowserRouter`**, you would need to add a catch-all redirect. For Cloudflare Pages, create a `public/_redirects` file:
   ```
   /*  /index.html  200
   ```
   However, this project intentionally uses HashRouter to avoid this complexity.

---

### 7.3 Edge Functions not accessible after deployment

**Problem:** Edge Functions return 404 Not Found or are unreachable after deploying to production.

**Cause:** Edge Functions must be deployed separately from the frontend. They run on Supabase infrastructure, not Cloudflare Pages.

**Solution:**

1. **Deploy Edge Functions to Supabase:**
   ```bash
   # Deploy a specific function
   supabase functions deploy video-signed-url

   # Deploy all functions
   supabase functions deploy
   ```

2. **Authenticate for non-interactive environments:**
   ```bash
   supabase login --token sbp_xxxxxxxxxxxxxxxx
   ```

3. **Verify deployment:**
   ```bash
   supabase functions list
   ```

4. **Check the function is reachable:**
   ```bash
   curl -I https://pdengtcdtszpvwhedzxn.supabase.co/functions/v1/video-signed-url
   # Should return 401 (JWT required) or 200, not 404
   ```

5. **Verify `verify_jwt` settings** in `supabase/config.toml`. If a function requires JWT but is being called without one (e.g., a webhook), it will return 401. Functions with `verify_jwt = false`:
   - `checkout-webhook` (called by Razorpay)

6. **If the function was recently created**, ensure its directory structure is correct:
   ```
   supabase/functions/<function-name>/index.ts
   ```
   The function name in the directory must match the config and deployment command.

7. **Check Supabase Dashboard > Edge Functions** for deployment status, invocation logs, and errors.

---

## Quick Reference: Diagnostic Commands

```bash
# Local development
supabase start                  # Start local Supabase
supabase status                 # Check local services
supabase db reset               # Reset DB (migrations + seed)
supabase logs --type postgres   # View database logs
supabase functions serve <name> # Test Edge Function locally

# Build and test
npm run dev                     # Start dev server (port 3000)
npm run build                   # Production build
npm test                        # Run tests (Vitest)
npm run lint                    # ESLint
npm run type-check              # TypeScript check

# Production deployment
supabase functions deploy       # Deploy all Edge Functions
supabase secrets list           # List configured secrets
supabase secrets set KEY=value  # Set a secret
npx wrangler pages deploy dist --project-name eyebucks --commit-dirty=true  # Deploy frontend

# Database inspection
supabase migration list         # List applied migrations
```

---

## Quick Reference: Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend `.env` + Cloudflare Pages | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env` + Cloudflare Pages | Supabase anonymous key (public) |
| `VITE_RAZORPAY_KEY_ID` | Frontend `.env` + Cloudflare Pages | Razorpay public key |
| `RAZORPAY_KEY_ID` | Supabase Secrets | Razorpay key ID (server-side) |
| `RAZORPAY_KEY_SECRET` | Supabase Secrets | Razorpay secret (server-side) |
| `RAZORPAY_WEBHOOK_SECRET` | Supabase Secrets | Razorpay webhook verification |
| `BUNNY_API_KEY` | Supabase Secrets | Bunny.net Stream API key |
| `BUNNY_LIBRARY_ID` | Supabase Secrets | Bunny.net Stream library ID |
| `BUNNY_CDN_HOSTNAME` | Supabase Secrets | Bunny.net CDN hostname |
| `BUNNY_TOKEN_KEY` | Supabase Secrets | Bunny.net token auth key |
| `RESEND_API_KEY` | Supabase Secrets | Resend email API key |
| `GOOGLE_CLIENT_ID` | Supabase Auth Config | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Supabase Auth Config | Google OAuth client secret |
