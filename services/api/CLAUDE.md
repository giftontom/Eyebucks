# API Services — Local Conventions

## Overview
13 typed API modules, all barrel-exported from `services/api/index.ts`.
Every module uses the singleton Supabase client from `services/supabase.ts`.

**Rule:** Never create a new Supabase client here — always import the singleton.

## 13 Modules
| Module | Purpose |
|--------|---------|
| `courses.api.ts` | Course + module queries |
| `enrollments.api.ts` | Enrollment access + progress |
| `progress.api.ts` | Module progress + completion (AUTO_SAVE_INTERVAL=30000, COMPLETION_THRESHOLD=0.95) |
| `checkout.api.ts` | Razorpay order creation + verification |
| `admin.api.ts` | Admin dashboard + CRUD |
| `notifications.api.ts` | User notifications |
| `payments.api.ts` | Payment history + refunds |
| `certificates.api.ts` | User certificates |
| `siteContent.api.ts` | CMS content |
| `reviews.api.ts` | Course reviews CRUD |
| `users.api.ts` | User profile operations |
| `coupons.api.ts` | Coupon validation |
| `wishlist.api.ts` | User wishlist (favorites) |

## Query Patterns

### Standard select
```ts
const { data, error } = await supabase.from('table').select('col1, col2').eq('id', id);
if (error) throw error;
```

### RPC call
```ts
const { data, error } = await supabase.rpc('function_name', { param1, param2 });
if (error) throw error;
```

### Edge Function call
```ts
const { data, error } = await supabase.functions.invoke('function-name', { body: { ... } });
if (error) throw error;
```

### Single row
```ts
.single() // throws PostgrestError if 0 or >1 rows
.maybeSingle() // returns null if not found, no error
```

## Rules
- Always destructure `{ data, error }` and `if (error) throw error`
- Chain order matters: `.from()` → `.select()` → `.eq()/.filter()` → `.order()` → `.limit()`
- No business logic here — only data access. Logic belongs in Edge Functions or hooks.
- Admin API uses service_role implicitly — RLS is enforced via `is_admin()` DB function
- Add new functions to the barrel in `services/api/index.ts`
