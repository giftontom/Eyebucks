# Access Control

> Eyebuckz LMS access control documentation (v2). Reflects the current Supabase-based architecture.
> Replaces the v1 doc that described the legacy Express/JWT system.

---

## Authentication

### Providers

- **Production:** Supabase Auth with Google OAuth. Users click "Sign in with Google", which redirects through Supabase's OAuth flow and back to the app origin.
- **Development:** Email/password login via `loginDev()` in AuthContext. Uses hardcoded credentials (`test@example.com` / `admin@eyebuckz.com`) with auto-signup if the account does not exist.

### Session Management

- Sessions are managed entirely by Supabase Auth (not custom JWTs).
- Access tokens are short-lived JWTs (1-hour expiry by default).
- Refresh tokens rotate automatically via `supabase-js` client.
- The frontend never stores tokens manually -- `supabase-js` handles persistence in `localStorage`.

### AuthContext (`context/AuthContext.tsx`)

The central auth state manager for the React app:

1. On mount, calls `supabase.auth.getSession()` to restore any existing session.
2. Subscribes to `supabase.auth.onAuthStateChange()` for real-time auth events.
3. On `SIGNED_IN`, loads the user profile from the `users` table with exponential backoff retry (waits for the auth trigger to create the profile row).
4. On `SIGNED_OUT`, clears user and session state.
5. Exposes: `user`, `session`, `isLoading`, `login`, `loginWithGoogle`, `loginDev`, `logout`, `updatePhoneNumber`, `updateProfile`.

### Auth Trigger (`supabase/migrations/004_auth_trigger.sql`)

A PostgreSQL trigger (`handle_new_user`) fires on `INSERT` into `auth.users` and auto-creates a row in `public.users` with:

- `id` = Supabase Auth UID
- `name` = extracted from Google metadata (`full_name` or `name`) or email prefix
- `email`, `avatar`, `google_id` from OAuth metadata
- `role` = `'USER'` (default -- never `'ADMIN'`)
- `email_verified` = true for Google OAuth users

A second trigger (`handle_user_login`) updates `last_login_at` on each sign-in.

---

## Route Protection Matrix

All routes use HashRouter (`/#/path`). Lazy-loaded routes use `React.lazy()` + `<Suspense>`.

| Route | Auth Required | Admin Required | Component Guard | Additional Check |
|-------|:---:|:---:|-----------------|------------------|
| `/` | No | No | -- | -- |
| `/login` | No | No | -- | Redirects to `returnTo` if already logged in |
| `/course/:id` | No | No | -- | -- |
| `/privacy` | No | No | -- | -- |
| `/terms` | No | No | -- | -- |
| `/checkout/:id` | Yes | No | `ProtectedRoute` | -- |
| `/dashboard` | Yes | No | `ProtectedRoute` | -- |
| `/learn/:id` | Yes | No | `ProtectedRoute` | `EnrollmentGate` via `useAccessControl` |
| `/profile` | Yes | No | `ProtectedRoute` | -- |
| `/success` | Yes | No | `ProtectedRoute` | -- |
| `/admin/*` | Yes | Yes | `ProtectedRoute` + `AdminLayout` | `AdminLayout` checks `user.role === 'ADMIN'` |
| `*` (catch-all) | No | No | -- | Redirects to `/` |

---

## Client-Side Guards

Client-side guards exist for UX only. They prevent unauthenticated or unauthorized users from seeing pages they cannot use, but they are **not a security boundary**. All actual data access is enforced server-side by RLS policies and Edge Function auth checks.

### ProtectedRoute (`components/ProtectedRoute.tsx`)

Wraps any route that requires authentication.

**Behavior:**
1. Reads `user` and `isLoading` from `useAuth()`.
2. While `isLoading` is true, renders a centered loading spinner with "Checking authentication..." text.
3. If `user` is null (not authenticated), redirects to `/login` (or a custom `redirectTo` prop) with `state.returnTo` set to the current path + search params.
4. If `user` exists, renders `children`.

**Props:**
- `children: React.ReactNode` -- the protected content
- `redirectTo?: string` -- override redirect target (defaults to `'/login'`)

### AdminLayout (`pages/admin/AdminLayout.tsx`)

Wraps all `/admin/*` routes. Applied inside `ProtectedRoute`, so the user is guaranteed to be authenticated when this component renders.

**Behavior:**
1. Reads `user` and `isLoading` from `useAuth()`.
2. While loading, shows a full-screen spinner.
3. If `user.role !== 'ADMIN'`, renders a full-screen "Access Denied" message with a link back to `/`.
4. If admin, wraps content in `<AdminProvider>` context and renders `<AdminSidebar>` + `<Outlet>`.

### EnrollmentGate (`components/EnrollmentGate.tsx`)

Displayed in `Learn.tsx` when the user lacks course access.

**Behavior:**
1. `Learn.tsx` calls `useAccessControl(courseId)` which returns `{ hasAccess, isLoading, isEnrolled, isAdmin }`.
2. `hasAccess` = `isAdmin || isEnrolled`. Admins always have access.
3. If `hasAccess` is false, `Learn.tsx` renders `<EnrollmentGate>` instead of the video player.
4. `EnrollmentGate` shows the course thumbnail, description, pricing, and a CTA to enroll (navigates to `/checkout/:id`).

### useAccessControl Hook (`hooks/useAccessControl.ts`)

**Logic:**
1. If no user or no courseId, sets `hasAccess = false`.
2. If `user.role === 'ADMIN'`, immediately sets `hasAccess = true` (skips enrollment check).
3. Otherwise, calls `enrollmentsApi.checkAccess(courseId)` which queries the `enrollments` table (RLS scoped to `user_id = auth.uid()`).
4. Returns `{ hasAccess, isLoading, isEnrolled, isAdmin, checkEnrollment }`.

---

## Server-Side Enforcement (RLS)

Row Level Security is the **actual security boundary**. Every table has RLS enabled. Client-side guards are UX conveniences; bypassing them grants no data access because RLS policies reject unauthorized queries at the database level.

### is_admin() Function (`supabase/migrations/003_rls_policies.sql`)

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Declared `SECURITY DEFINER` so it can read the `users` table regardless of the caller's RLS context. Used in nearly every admin-gated policy.

### RLS Policy Summary by Table

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Own row (`id = auth.uid()`) or `is_admin()` | Own row or `is_admin()` | Own row or `is_admin()` | -- |
| `courses` | Published + not deleted, or `is_admin()` | `is_admin()` | `is_admin()` | `is_admin()` |
| `modules` | Parent course is published, or `is_admin()` | `is_admin()` | `is_admin()` | `is_admin()` |
| `enrollments` | Own (`user_id = auth.uid()`) or `is_admin()` | Own or `is_admin()` | Own or `is_admin()` | `is_admin()` only |
| `progress` | Own or `is_admin()` | Own only | Own only | Own or `is_admin()` |
| `certificates` | Own + `status = 'ACTIVE'`, or `is_admin()` | `is_admin()` only | `is_admin()` only | `is_admin()` only |
| `reviews` | Public (all rows) | Own only | Own only | Own or `is_admin()` |
| `notifications` | Own only | `is_admin()` only | Own only | Own only |
| `payments` | Own (`user_id = auth.uid()`) | -- (created by Edge Functions) | -- | `is_admin()` |
| `site_content` | Active rows (`is_active = true`) | `is_admin()` | `is_admin()` | `is_admin()` |
| `bundle_courses` | Public (all rows) | `is_admin()` | `is_admin()` | `is_admin()` |
| `login_attempts` | `is_admin()` | `is_admin()` | -- | -- |

> **Note:** The `sessions` and `refresh_tokens` tables from the legacy auth system have been dropped (migration 009). Session management is now handled entirely by Supabase Auth.

### Key RLS Patterns

- **User-scoped reads:** `USING (user_id = auth.uid())` -- user can only see their own rows.
- **Admin override:** `OR is_admin()` appended to most policies -- admins see everything.
- **Public reads:** `USING (true)` or condition-based (e.g., `status = 'PUBLISHED'`) -- no auth required for SELECT.
- **Write restrictions:** Most user writes are scoped to `WITH CHECK (user_id = auth.uid())`. Admin-only writes use `WITH CHECK (is_admin())`.
- **No user DELETE on enrollments:** Only admins can delete enrollments (prevents self-unenrollment to exploit refund flows).

---

## Edge Function Authorization

Edge Functions run in the Deno runtime on Supabase infrastructure. They handle server-side secrets (Razorpay, Bunny.net, Resend) and privileged operations that require the `service_role` key.

### Shared Auth Helpers (`supabase/functions/_shared/auth.ts`)

#### verifyAuth(req, corsHeaders)

Extracts and validates the JWT from the `Authorization` header:

1. Checks for the `Authorization` header. Returns 401 if missing.
2. Creates a Supabase client scoped to the caller's JWT.
3. Calls `supabase.auth.getUser()` to validate the token server-side (not just decoding -- actually verifies with Supabase Auth).
4. Returns `{ user: { id, email } }` on success or `{ errorResponse }` (401 Response) on failure.

#### verifyAdmin(userId, adminClient?)

Checks if a user has the ADMIN role:

1. Uses the admin client (service_role key, bypasses RLS) to query the `users` table.
2. Returns `true` if `profile.role === 'ADMIN'`, `false` otherwise.

### Service Role Client (`supabase/functions/_shared/supabaseAdmin.ts`)

`createAdminClient()` creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`. This client **bypasses all RLS policies** and is used for privileged operations like:

- Creating enrollment records after payment verification
- Generating certificates
- Processing refunds
- Writing payment records

### Auth Requirements by Edge Function

| Function | JWT Required | Admin Required | Special Auth |
|----------|:---:|:---:|--------------|
| `checkout-create-order` | Yes | No | -- |
| `checkout-verify` | Yes | No | Razorpay HMAC signature verification |
| `checkout-webhook` | **No** | No | Razorpay webhook signature (`x-razorpay-signature` header) |
| `video-signed-url` | Yes | No | -- |
| `admin-video-upload` | Yes | Yes | `verifyAdmin()` check |
| `certificate-generate` | Yes | No | Verifies user owns the enrollment |
| `progress-complete` | Yes | No | Verifies user owns the progress record |
| `refund-process` | Yes | Yes | `verifyAdmin()` check |

### checkout-webhook Exception

The `checkout-webhook` function is the only function that does **not** require JWT auth. It is called by Razorpay's servers, not by authenticated users. Authentication is via HMAC signature verification:

1. Reads `x-razorpay-signature` header.
2. Computes `HMAC-SHA256(request_body, RAZORPAY_WEBHOOK_SECRET)`.
3. Performs timing-safe comparison of computed vs. received signature.
4. Rejects the request if the signature is missing or invalid.

The function has `verify_jwt` disabled in its Supabase config.

---

## Admin Role Assignment

### Default Role

All new users are created with `role = 'USER'` by the `handle_new_user` auth trigger. There is no code path that assigns `'ADMIN'` during signup.

### Promotion Methods

1. **Direct database update:** `UPDATE users SET role = 'ADMIN' WHERE id = '<user-id>';` via Supabase dashboard or SQL editor.
2. **Admin API:** `admin.api.ts` exposes `updateUser()` which can set the role. This is gated by `is_admin()` RLS on the `users` table UPDATE policy.
3. **Dev mode shortcut:** `loginDev(true)` in `AuthContext` sets `role = 'ADMIN'` on the dev user's profile. This relies on the `users_update_own` RLS policy (users can update their own row), which is a known gap -- see Known Issues below.

### Admin Check Locations

Admin authorization is verified at three independent layers:

| Layer | Check | Purpose |
|-------|-------|---------|
| Client (AdminLayout) | `user.role !== 'ADMIN'` | UX gate -- shows "Access Denied" |
| Edge Functions (`verifyAdmin`) | Queries `users.role` via service_role client | Server-side gate for privileged operations |
| Database (RLS `is_admin()`) | `SELECT EXISTS (... role = 'ADMIN')` | Data access enforcement |

---

## Data Access Patterns

### Public Data (no auth required)

- Published courses with `deleted_at IS NULL`
- Course modules (if parent course is published)
- Active site content (`is_active = true`)
- All reviews (public read)
- Bundle-course join records

### User's Own Data (auth required, scoped by `user_id = auth.uid()`)

- Enrollments
- Progress records
- Active certificates
- Notifications
- Payment history

### Admin Data (auth required + `is_admin()`)

- All records across all tables (full read access)
- Draft/unpublished/deleted courses
- All users' enrollments, progress, payments
- Revoked certificates
- Login attempt logs

### Privileged Operations (Edge Functions with service_role key)

- Creating enrollments after payment verification
- Generating and storing certificates
- Processing refunds and updating payment status
- Uploading videos to Bunny.net
- Sending emails via Resend

---

## Known Issues

1. **Self-promotion gap in dev mode:** The `loginDev()` function updates the user's own role to `'ADMIN'` using the anon client. This succeeds because the `users_update_own` RLS policy allows users to update their own row without restricting which columns can be changed. In production (Google OAuth only), there is no UI to trigger this, but the RLS policy technically permits a user to `UPDATE users SET role = 'ADMIN' WHERE id = auth.uid()` via a direct Supabase client call. **Mitigation:** Add a column-level check to the `users_update_own` policy that excludes the `role` column, or use a `BEFORE UPDATE` trigger that prevents non-admin users from changing their own role.

2. **Client-side admin check is not a security boundary:** The `AdminLayout` component checks `user.role` from the React state, which originates from the `users` table query. If someone manipulates the client state, they would see admin UI but all actual data requests would fail at the RLS layer.

3. **Profile retry on signup:** The exponential backoff in `AuthContext` (200ms, 400ms, 800ms, 1600ms, 3000ms) exists because the auth trigger that creates the user profile runs asynchronously. If all retries fail, the user will have a session but no profile loaded. This is a race condition, not a security issue.

---

## Implementation Checklist for New Features

When adding a new feature that requires access control:

- [ ] **Define RLS policies** for any new tables in a migration file
- [ ] Use `auth.uid()` for user-scoped access and `is_admin()` for admin access
- [ ] **Add route guard** in `App.tsx` using `<ProtectedRoute>` for authenticated routes
- [ ] For admin routes, add under `/admin/*` so `AdminLayout` applies automatically
- [ ] **For Edge Functions**, use `verifyAuth()` for JWT validation and `verifyAdmin()` for admin checks
- [ ] Use `createAdminClient()` only when the operation requires bypassing RLS (never for user-initiated reads)
- [ ] **Never trust client state** for authorization -- always enforce at the RLS or Edge Function layer
- [ ] **Test with both user and admin roles** to verify access boundaries
