# Security Model

This document describes the security architecture of the Eyebuckz LMS platform.
It covers authentication, authorization (RLS), Edge Function access control,
payment and video security, CORS policy, and secret management.

Target audience: developers contributing to the codebase and security auditors
reviewing the deployment.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization - Row Level Security (RLS)](#authorization---row-level-security-rls)
3. [Edge Function Auth](#edge-function-auth)
4. [Payment Security](#payment-security)
5. [Video Security](#video-security)
6. [CORS Policy](#cors-policy)
7. [Secret Management](#secret-management)
8. [Known Vulnerabilities](#known-vulnerabilities)

---

## Authentication

### Provider

Supabase Auth with **Google OAuth** as the primary identity provider.

### Session Configuration

| Parameter             | Value                                          |
|-----------------------|------------------------------------------------|
| JWT expiry            | 1 hour                                         |
| Refresh token rotation| Enabled                                        |
| Reuse interval        | 10 seconds (grace period for concurrent requests) |

### Auth Trigger: `handle_new_user`

A PostgreSQL trigger fires on every new `auth.users` insert and auto-creates a
row in the public `users` table. It extracts the following from Google metadata:

- `full_name` -- from `raw_user_meta_data->>'full_name'`
- `avatar_url` -- from `raw_user_meta_data->>'avatar_url'`
- `sub` -- Google subject identifier

This ensures every authenticated user has a corresponding application profile
immediately after their first sign-in.

### Dev Login (Local Development Only)

An email/password fallback exists for local development and testing:

| Account               | Password          | Role  |
|------------------------|-------------------|-------|
| admin@eyebuckz.com     | dev-password-123  | ADMIN |
| test@example.com       | dev-password-123  | USER  |

> **Warning:** The `loginDev` function and these credentials are compiled into
> the production JavaScript bundle. See [Known Vulnerabilities](#known-vulnerabilities)
> item 1.

---

## Authorization - Row Level Security (RLS)

All 12 active tables have RLS enabled. Security is enforced at the database
level, not in frontend code. The `is_admin()` SQL helper function checks
whether the current JWT user has `role = 'ADMIN'` in the `users` table.

### Complete Policy Matrix

#### `users`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own row (`auth.uid() = id`) OR `is_admin()`         |
| INSERT    | Own row OR `is_admin()`                             |
| UPDATE    | Own row OR `is_admin()`                             |
| DELETE    | --                                                  |

> **Note:** There is no column-level restriction on the `role` field. A user
> could theoretically update their own `role` to `'ADMIN'`. See
> [Known Vulnerabilities](#known-vulnerabilities) item 2.

#### `courses`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Published AND non-deleted courses (public), OR `is_admin()` |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `modules`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | If parent course is published (public), OR `is_admin()` |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `enrollments`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own rows OR `is_admin()`                            |
| INSERT    | Own rows OR `is_admin()`                            |
| UPDATE    | Own rows OR `is_admin()`                            |
| DELETE    | `is_admin()` only                                   |

#### `progress`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own rows OR `is_admin()`                            |
| INSERT    | Own rows only                                       |
| UPDATE    | Own rows only                                       |
| DELETE    | Own rows OR `is_admin()`                            |

#### `certificates`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own rows (active status only) OR `is_admin()`       |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `reviews`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Public (all rows visible)                           |
| INSERT    | Own rows only                                       |
| UPDATE    | Own rows only                                       |
| DELETE    | Own rows OR `is_admin()`                            |

#### `notifications`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own rows only                                       |
| UPDATE    | Own rows only                                       |
| DELETE    | Own rows only                                       |
| INSERT    | `is_admin()` only                                   |

#### `payments`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Own rows only                                       |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `bundle_courses`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Public (all rows visible)                           |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `site_content`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | Active items only (public)                          |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | `is_admin()` only                                   |
| DELETE    | `is_admin()` only                                   |

#### `login_attempts`

| Operation | Policy                                              |
|-----------|-----------------------------------------------------|
| SELECT    | `is_admin()` only                                   |
| INSERT    | `is_admin()` only                                   |
| UPDATE    | --                                                  |
| DELETE    | --                                                  |

---

## Edge Function Auth

### Shared Auth Utilities

Located in `supabase/functions/_shared/`:

- **`auth.ts`** -- provides `verifyAuth(req)` and `verifyAdmin(userId)`
- **`supabaseAdmin.ts`** -- creates a service-role Supabase client that bypasses
  RLS for privileged operations

#### `verifyAuth(req)`

1. Extracts the JWT from the `Authorization: Bearer <token>` header.
2. Creates a Supabase client scoped to that token.
3. Validates the token via `auth.getUser()`.
4. Returns the authenticated user object or throws.

#### `verifyAdmin(userId)`

1. Queries the `users` table for the given `userId`.
2. Checks that `role = 'ADMIN'`.
3. Returns `true` or throws an authorization error.

### Function Access Matrix

| Function               | JWT Required | Admin Required | Notes                                    |
|------------------------|:------------:|:--------------:|------------------------------------------|
| `checkout-create-order`| Yes          | No             | Any authenticated user                   |
| `checkout-verify`      | Yes          | No             | Verifies payment for the calling user    |
| `checkout-webhook`     | **No**       | N/A            | Called by Razorpay servers directly       |
| `video-signed-url`     | Yes          | No             | Enrollment checked per video/course      |
| `admin-video-upload`   | Yes          | **Yes**        | Full admin check                         |
| `certificate-generate` | Yes          | No (self)      | Self-service; admin required for others  |
| `progress-complete`    | Yes          | No             | Marks own module progress                |
| `refund-process`       | Yes          | **Yes**        | Admin-only financial operation           |

---

## Payment Security

### Order Creation

- Orders are created server-side in the `checkout-create-order` Edge Function.
- The Razorpay **secret key** never leaves the server; only the public key ID
  is available to the frontend (`VITE_RAZORPAY_KEY_ID`).

### Payment Verification (`checkout-verify`)

1. **HMAC-SHA256 signature verification** -- the Edge Function computes
   `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)` and
   compares it to the signature sent by the client.
2. **Timing-safe comparison** -- uses a constant-time string comparison to
   prevent timing attacks on the signature.
3. **Amount verification** -- as defense-in-depth, the actual paid amount is
   verified against the course price by querying the Razorpay API server-side.

### Webhook (`checkout-webhook`)

- Does **not** require a JWT (Razorpay calls it directly).
- Uses a **separate webhook secret** for signature verification, distinct from
  the API secret.
- **Idempotency**: checks for an existing enrollment before creating a new one,
  preventing duplicate enrollments from retried webhook deliveries.

---

## Video Security

### Signed URL Generation

Video access is controlled by the `video-signed-url` Edge Function:

1. The frontend requests a signed URL, passing the video GUID and course ID.
2. The Edge Function verifies the user's JWT.
3. Access control logic:
   - **Admin**: can access any video (no enrollment check).
   - **Enrolled user**: can access videos belonging to courses they are enrolled in.
   - **Free preview**: modules marked as free preview bypass the enrollment check.
4. A signed token is generated:
   ```
   token = base64url(SHA256(tokenKey + path + expires))
   ```
5. The signed HLS URL is returned with a 1-hour expiry.

### Token Lifecycle

| Parameter            | Value                                           |
|----------------------|-------------------------------------------------|
| Token algorithm      | SHA256                                          |
| Token encoding       | base64url                                       |
| Expiry               | 1 hour from generation                          |
| Frontend refresh     | 5 minutes before expiry                         |
| CDN delivery         | Bunny.net Stream HLS (`playlist.m3u8`)          |

---

## CORS Policy

### Origin Allowlist

Defined in `supabase/functions/_shared/cors.ts`:

**Production:**
- `https://eyebuckz.com`
- `https://www.eyebuckz.com`
- `https://dev.eyebuckz.com`

**Development:**
- `http://localhost:3000`
- `http://localhost:5173`

**Cloudflare Pages Preview Deployments:**
- Regex: `/^https:\/\/[a-z0-9-]+\.eyebucks(-dev)?\.pages\.dev$/`

### Behavior

- The `Access-Control-Allow-Origin` header is set to the **exact requesting
  origin** if it matches the allowlist. A wildcard (`*`) is **never** used.
- The `Vary: Origin` header is included on every response to ensure caches
  differentiate by origin.
- All Edge Functions call `getCorsHeaders(req)` from the shared CORS module.

---

## Secret Management

### Public (Frontend) Variables

These are embedded in the client-side JavaScript bundle via Vite's `VITE_`
prefix convention. They are **not secrets**.

| Variable                  | Purpose                        |
|---------------------------|--------------------------------|
| `VITE_SUPABASE_URL`      | Supabase project API endpoint  |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key  |
| `VITE_RAZORPAY_KEY_ID`   | Razorpay public key identifier |

### Server Secrets

Set via `supabase secrets set` and available only within Edge Functions at
runtime. These are **never** sent to the frontend.

| Secret                     | Used By                        |
|----------------------------|--------------------------------|
| `RAZORPAY_KEY_SECRET`     | checkout-create-order, checkout-verify |
| `RAZORPAY_WEBHOOK_SECRET` | checkout-webhook               |
| `BUNNY_STREAM_TOKEN_KEY`  | video-signed-url               |
| `RESEND_API_KEY`          | Email sending (various)        |

### Practices

- `.env` files are listed in `.gitignore` and never committed.
- Secret values are never logged, even in error handlers.
- Edge Functions access secrets via `Deno.env.get()` at runtime.

---

## Known Vulnerabilities

### 1. Dev Credentials in Production Bundle (Severity: Medium)

**Description:** The `loginDev` function in the authentication module contains
hardcoded test credentials (`admin@eyebuckz.com` / `dev-password-123` and
`test@example.com` / `dev-password-123`). Because Vite bundles all imported
code, these strings are present in the production JavaScript output.

**Impact:** An attacker who inspects the JS bundle can discover valid
credentials. If the corresponding accounts exist in the production Supabase
Auth database, this grants unauthorized access -- including admin access.

**Mitigation:** Remove the dev login path from production builds using a
build-time feature flag or conditional import. Ensure the test accounts do not
exist in the production Auth database.

### 2. No RLS Restriction on Role Column Updates (Severity: Low)

**Description:** The `users` table UPDATE policy allows users to update their
own row, but there is no column-level restriction preventing a user from
changing their `role` field to `'ADMIN'`.

**Impact:** A technically sophisticated user could craft a direct Supabase
client call to set `role = 'ADMIN'` on their own profile, granting themselves
full administrative access.

**Mitigation:** Add a column restriction to the RLS policy:

```sql
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (role IS NOT DISTINCT FROM (SELECT role FROM users WHERE id = auth.uid()))
  );
```

Alternatively, use a `BEFORE UPDATE` trigger that prevents non-admin users from
modifying the `role` column.

### 3. Filter Injection in `admin.api.ts` (Severity: Low)

**Description:** The admin API module constructs `.or()` filter strings by
interpolating user-supplied search values directly into the query string. For
example:

```typescript
.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
```

**Impact:** A crafted search string containing PostgREST filter syntax could
manipulate the query logic, potentially exposing data that should be filtered
out. The risk is limited because admin endpoints are already restricted to
admin users by RLS.

**Mitigation:** Sanitize or escape the search input before interpolation.
Alternatively, use parameterized `.ilike()` calls instead of `.or()` string
construction.
