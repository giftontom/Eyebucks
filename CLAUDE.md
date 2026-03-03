# Eyebuckz LMS - Project Context

## Stack

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS + React Router 7 (HashRouter)
- **Backend:** Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions)
- **Payments:** Razorpay (Edge Functions handle secrets)
- **Video:** Bunny.net Stream (HLS, signed URLs via Edge Function)
- **Email:** Resend (via Edge Function)
- **Deploy:** Cloudflare Pages (frontend) + Supabase (backend)

## Key Patterns

- **Auth:** Supabase Auth with Google OAuth. `context/AuthContext.tsx` manages session state. Auth trigger auto-creates user profile on signup.
- **Data access:** All queries go through `services/api/*.api.ts` modules using `@supabase/supabase-js`. Security is enforced by RLS policies at the database level, not in frontend code.
- **Edge Functions:** Deno runtime in `supabase/functions/`. Used for server-side secrets (Razorpay, Bunny.net, Resend). Most require JWT auth; `checkout-webhook` does not (Razorpay calls it). Shared utilities in `supabase/functions/_shared/`.
- **Types:** `types/index.ts` (business types), `types/api.ts` (request/response), `types/supabase.ts` (auto-generated DB types).
- **Admin pages:** Split into sub-pages under `pages/admin/` with shared `AdminContext` and `AdminLayout`.

## Where to Add New Code

| What | Where | Notes |
|------|-------|-------|
| New API query | `services/api/{domain}.api.ts` | Add to barrel in `services/api/index.ts` |
| New shared component | `components/{Name}.tsx` | PascalCase filename |
| New hook | `hooks/use{Name}.ts` | camelCase with `use` prefix |
| New page | `pages/{Name}.tsx` | Add route in `App.tsx` |
| New admin page | `pages/admin/{Name}Page.tsx` | Add route in `AdminRoutes.tsx` |
| New Edge Function | `supabase/functions/{kebab-name}/index.ts` | Use `_shared/` helpers |
| New admin hook | `pages/admin/hooks/use{Name}.ts` | camelCase with `use` prefix |
| New DB migration | `supabase/migrations/{NNN}_{description}.sql` | Next number: 013 |
| New business type | `types/index.ts` | |
| New API type | `types/api.ts` | |

## Import Conventions

- Pages/components import from `services/api/` directly (the canonical layer)
- Use `import type {}` for type-only imports
- Use relative paths (not `@/` alias)
- Import order: external deps > internal modules > components > types

## Edge Function Conventions

- Import shared helpers from `../_shared/` (cors, auth, response, etc.)
- Return JSON: `{ success: boolean, error?: string, ...data }`
- Use `getCorsHeaders(req)` from `_shared/cors.ts`
- Log as: `console.error('[FunctionName] Context:', error)`

## Commands

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm test               # Run tests (Vitest)
npm run lint           # ESLint
npm run type-check     # TypeScript check
supabase db reset      # Reset local DB + migrations + seed
supabase functions deploy  # Deploy Edge Functions
```

## Environment

- Frontend env vars are `VITE_` prefixed (public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`
- Server secrets set via `supabase secrets set` (Razorpay, Bunny, Resend keys)
- `tsconfig.json` excludes `server/` and `supabase/` directories

## Important Files

- `index.tsx` - Entry point (handles OAuth callback before React renders)
- `App.tsx` - Routes + providers (HashRouter)
- `services/supabase.ts` - Supabase client singleton
- `context/AuthContext.tsx` - Auth state management
- `supabase/migrations/` - 12 sequential SQL migrations (001-012)
- `supabase/functions/` - 8 Edge Functions: `admin-video-upload`, `certificate-generate`, `checkout-create-order`, `checkout-verify`, `checkout-webhook`, `progress-complete`, `refund-process`, `video-signed-url`

## API Modules

| Module | Purpose |
|--------|---------|
| `courses.api.ts` | Course + module queries |
| `enrollments.api.ts` | Enrollment access + progress tracking |
| `progress.api.ts` | Module progress + completion logic |
| `checkout.api.ts` | Razorpay order creation + verification |
| `admin.api.ts` | Admin dashboard + CRUD |
| `notifications.api.ts` | User notifications |
| `payments.api.ts` | Payment history + refunds |
| `certificates.api.ts` | User certificates |
| `siteContent.api.ts` | CMS content |
| `reviews.api.ts` | Course reviews CRUD |
| `users.api.ts` | User profile operations |
