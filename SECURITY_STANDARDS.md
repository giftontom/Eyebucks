# Security Standards - Eyebuckz LMS

**Version:** 2.0.0
**Last Updated:** February 27, 2026

---

## Overview

Security standards for Eyebuckz LMS. The application uses Supabase for authentication and authorization via Row Level Security (RLS), with Edge Functions handling server-side secrets.

---

## Architecture

```
Client (React)
  ├── Supabase Auth (Google OAuth, session management)
  ├── PostgREST queries (filtered by RLS policies)
  └── Edge Function calls (checkout, video, certificates)

Supabase
  ├── PostgreSQL + RLS (data access control)
  ├── Auth (JWT tokens, OAuth providers)
  ├── Edge Functions (server-side secrets, business logic)
  └── Realtime (notification subscriptions)
```

**Key principle:** Security is enforced at the database level via RLS, not in frontend code. The frontend is untrusted.

---

## Authentication

### Supabase Auth

Authentication is handled entirely by Supabase Auth. No custom JWT or password hashing.

```typescript
// Google OAuth login
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
});

// Session management is automatic via supabase-js
const { data: { session } } = await supabase.auth.getSession();

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Load user profile
  }
  if (event === 'SIGNED_OUT') {
    // Clear state
  }
});
```

### Auth Trigger

A database trigger automatically creates a user profile when someone signs up:

```sql
-- 004_auth_trigger.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'USER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Session Configuration

```toml
# supabase/config.toml
[auth]
jwt_expiry = 3600                      # 1 hour
enable_refresh_token_rotation = true   # Rotate on use
refresh_token_reuse_interval = 10      # 10-second grace period
```

---

## Authorization (Row Level Security)

All tables have RLS enabled. Access control is enforced at the PostgreSQL level.

### Admin Check

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS Policy Patterns

```sql
-- Users can only read their own data
CREATE POLICY "enrollments_user_read" ON enrollments
  FOR SELECT USING (user_id = auth.uid());

-- Users can only modify their own data
CREATE POLICY "progress_user_write" ON progress
  FOR ALL USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (is_admin());

-- Public read for published content
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (status = 'PUBLISHED' AND deleted_at IS NULL);
```

### Best Practices

- Always enable RLS on new tables: `ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;`
- Filter by `auth.uid()` for user-scoped data
- Use `is_admin()` for admin-only operations
- Add explicit user_id filters in API queries as defense-in-depth (even though RLS handles it)
- Test policies by querying as different roles

---

## Edge Function Security

Edge Functions handle operations requiring server-side secrets (payment keys, video tokens, etc.).

### Authentication in Edge Functions

```typescript
// Always verify the user in Edge Functions
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders }
  );
}
```

### Admin Verification

```typescript
// For admin-only Edge Functions, verify admin role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const { data: profile } = await supabaseAdmin
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'ADMIN') {
  return new Response(
    JSON.stringify({ success: false, error: 'Admin access required' }),
    { status: 403, headers: corsHeaders }
  );
}
```

### Service Role Key

The `service_role` key bypasses RLS. Use only in Edge Functions for privileged operations:

```typescript
// Use service_role for operations that need to bypass RLS
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Example: Create enrollment after payment verification
await supabaseAdmin.from('enrollments').insert({
  user_id: user.id,
  course_id: courseId,
  status: 'ACTIVE',
});
```

**Never expose the service_role key to the frontend.**

---

## Payment Security (Razorpay)

### Order Creation

```typescript
// checkout-create-order: Create order server-side with secret key
const response = await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ amount, currency: 'INR' }),
});
```

### Payment Verification (HMAC)

```typescript
// checkout-verify: Verify payment signature
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const payload = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

// Always require the signature
if (!signature) {
  return new Response(
    JSON.stringify({ success: false, error: 'Missing payment signature' }),
    { status: 400, headers: corsHeaders }
  );
}
```

### Webhook Verification

```typescript
// checkout-webhook: Verify webhook signature
if (!webhookSecret) {
  console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
  return new Response('Webhook secret not configured', { status: 500 });
}

if (!signature) {
  return new Response('Missing signature', { status: 400 });
}

const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
if (!isValid) {
  return new Response('Invalid signature', { status: 400 });
}
```

---

## Video URL Security (Bunny.net)

Video URLs are signed server-side with time-limited tokens:

```typescript
// video-signed-url Edge Function
function generateSignedUrl(videoId: string, tokenKey: string, expiresIn: number): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const path = `/${videoId}/playlist.m3u8`;
  const hashable = `${tokenKey}${path}${expires}`;
  const hash = createHash('sha256').update(hashable).digest('base64url');
  return `https://${cdnHostname}${path}?token=${hash}&expires=${expires}`;
}
```

- Enrollment is verified before generating signed URLs
- Free preview videos bypass enrollment check
- Tokens expire (typically 1 hour)
- Frontend refreshes tokens 5 minutes before expiry

---

## Input Validation

### Edge Functions

```typescript
// Validate request body
const { courseId, amount } = await req.json();

if (!courseId || typeof courseId !== 'string') {
  return new Response(
    JSON.stringify({ success: false, error: 'Invalid courseId' }),
    { status: 400, headers: corsHeaders }
  );
}

if (!amount || typeof amount !== 'number' || amount <= 0) {
  return new Response(
    JSON.stringify({ success: false, error: 'Invalid amount' }),
    { status: 400, headers: corsHeaders }
  );
}
```

### Frontend

React automatically escapes rendered content (JSX), preventing XSS. Never use `dangerouslySetInnerHTML` with user-provided content.

---

## Secret Management

### Frontend (Public)

Only `VITE_*` prefixed variables are exposed to the browser. These are **public** keys:

```env
VITE_SUPABASE_URL=...          # Public project URL
VITE_SUPABASE_ANON_KEY=...     # Public anon key (RLS protects data)
VITE_RAZORPAY_KEY_ID=...       # Public payment key
```

### Edge Functions (Server-Side)

Secret keys are set via Supabase CLI and never reach the browser:

```bash
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set BUNNY_STREAM_TOKEN_KEY=...
supabase secrets set RESEND_API_KEY=...
```

### Rules

- Never commit `.env` files (`.gitignore` includes them)
- Never hardcode secrets in source code
- Never log secret values
- Rotate credentials immediately if exposed
- Use `VITE_` prefix only for truly public values

---

## CORS

Edge Functions use the shared `getCorsHeaders()` utility from `_shared/cors.ts`:

```typescript
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // ...
});
```

The utility validates `Origin` against an allowlist (production domains + localhost + Cloudflare Pages deployments) and falls back to the primary domain. Never use `'*'` for `Access-Control-Allow-Origin`.

---

## Error Handling

### Don't Leak Internal Details

```typescript
// Log full error internally
console.error(`[checkout-verify] Error for user ${user.id}:`, error);

// Return generic message to client
return new Response(
  JSON.stringify({ success: false, error: 'Internal server error' }),
  { status: 500, headers: corsHeaders }
);
```

### Never expose in responses:
- Database connection strings
- Stack traces
- Internal file paths
- Other users' data
- Service role keys

---

## Security Checklist

### Pre-Deployment

- [ ] All RLS policies tested for new tables
- [ ] Edge Functions verify auth token
- [ ] Payment signature verification is mandatory (not optional)
- [ ] Webhook signature verification is mandatory
- [ ] CORS restricted to production domains
- [ ] No secrets in frontend code
- [ ] Edge Function secrets set via `supabase secrets set`
- [ ] File uploads validated (size + type) in admin-video-upload
- [ ] Error responses don't leak internal details
- [ ] `service_role` key used only in Edge Functions

### Ongoing

- [ ] Monitor Supabase Auth logs for anomalies
- [ ] Review RLS policies when schema changes
- [ ] Rotate credentials periodically
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Review Edge Function logs for errors

---

## Known Security Issues

### 1. Dev Credentials in Production Bundle (Medium)

**Location:** `context/AuthContext.tsx` (loginDev function)

The dev login function contains hardcoded credentials (`admin@eyebuckz.com` / `dev-password-123`) that are included in the production JavaScript bundle. While the dev login UI is hidden in production, the credentials exist in the compiled code.

**Mitigation:** Guard `loginDev` behind `import.meta.env.DEV` so the code is tree-shaken in production builds.

### 2. No RLS Preventing Admin Self-Promotion (Low)

**Location:** `supabase/migrations/003_rls_policies.sql`

The `users` table RLS policies allow users to update their own row (`users_update_own`). The `role` column is not excluded from user self-updates, meaning a user could theoretically set their own role to `ADMIN` via a direct Supabase client call.

**Mitigation:** Add a column-level check or a trigger that prevents non-admin users from modifying the `role` column.

### 3. Filter Injection Risk in admin.api.ts (Low)

**Location:** `services/api/admin.api.ts`

The `.or()` filter uses string interpolation with user-provided search values:
```typescript
query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
```

While Supabase's PostgREST layer sanitizes these queries internally (this is not raw SQL), crafted filter strings could potentially manipulate the PostgREST filter syntax.

**Mitigation:** Sanitize search input to remove PostgREST filter operators (`.`, `,`) or use individual `.ilike()` calls.

---

## Resources

- [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Razorpay payment verification](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#verify-payment-signature)

---

**Last Updated:** February 27, 2026
