# Edge Functions — Local Conventions

## Runtime
- Deno (not Node.js) — use URL imports or `npm:` prefix (e.g. `import { serve } from "https://deno.land/std/http/server.ts"`)
- All functions live at `supabase/functions/{kebab-name}/index.ts`

## Shared Helpers (`../_shared/`)
| Helper | Import | Key Exports |
|--------|--------|-------------|
| `cors.ts` | `../_shared/cors.ts` | `getCorsHeaders(req)` |
| `auth.ts` | `../_shared/auth.ts` | `verifyAuth(req)` → `{ user, supabaseClient }` |
| `response.ts` | `../_shared/response.ts` | `jsonResponse(data, status?)`, `errorResponse(msg, status?)` |
| `bunny.ts` | `../_shared/bunny.ts` | Bunny CDN utilities |
| `resend.ts` | `../_shared/resend.ts` | Email sending via Resend |

## Standard Patterns

### Auth (JWT-protected functions)
```ts
const { user, supabaseClient } = await verifyAuth(req); // throws on invalid JWT
```

### Admin-only check
```ts
if (user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
```

### CORS (every handler)
```ts
const corsHeaders = getCorsHeaders(req);
if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
```

### Response shape
```ts
return jsonResponse({ success: true, ...data }); // always { success: boolean, error?: string }
```

### Logging
```ts
console.error('[FunctionName] Context:', error);
```

### Env vars
```ts
const secret = Deno.env.get('SECRET_NAME'); // never hardcode secrets
```

## Auth Exceptions
- `checkout-webhook` — no JWT (HMAC-verified Razorpay webhook)
- `video-signed-url` — deployed with `--no-verify-jwt` flag (ES256 JWT fix)

## 11 Functions
| Function | Auth | Purpose |
|----------|------|---------|
| `admin-video-upload` | JWT + admin | Bunny TUS upload credentials |
| `certificate-generate` | JWT | PDF certificate + Resend email |
| `checkout-create-order` | JWT | Create Razorpay order |
| `checkout-verify` | JWT | Verify Razorpay HMAC + create enrollment |
| `checkout-webhook` | No JWT (HMAC) | Razorpay async webhook fallback |
| `coupon-apply` | JWT | `apply_coupon` RPC wrapper |
| `progress-complete` | JWT | `complete_module` RPC + certificate trigger |
| `refund-process` | JWT + admin | Razorpay refund + DB update |
| `session-enforce` | JWT | Session validity on login (3s timeout, lenient) |
| `video-cleanup` | JWT + admin | Delete video from Bunny after module removal |
| `video-signed-url` | `--no-verify-jwt` | SHA256 signed CDN URL (1hr expiry) |

## Deploy
```bash
supabase functions deploy <function-name>
supabase functions deploy --all
```
