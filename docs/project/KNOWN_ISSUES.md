# Known Issues

Last updated: March 3, 2026

---

## Bugs

### 1. Privacy/Terms pages show dynamic "Last Updated" date

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **Files** | `pages/Privacy.tsx` (line 10), `pages/Terms.tsx` (line 10) |

**Description:**
Both the Privacy Policy and Terms of Service pages render the "Last updated" date using `new Date().toLocaleDateString(...)`. This means the date shown to users changes every day to the current date, which is misleading for a legal document. Users (and regulators) expect this date to reflect the last time the document content was actually revised.

**Code:**
```tsx
// pages/Privacy.tsx:10
<p className="text-neutral-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
```

**Suggested fix:**
Replace `new Date()` with a hardcoded string representing the actual last revision date:
```tsx
<p className="text-neutral-500 mb-8">Last updated: March 3, 2026</p>
```

---

### 2. `coursesApi.getCourse()` slug detection uses fragile `startsWith('c')` check

| | |
|---|---|
| **Severity** | Medium |
| **Priority** | Medium |
| **File** | `services/api/courses.api.ts` (line 126) |

**Description:**
The `getCourse` function determines whether the `idOrSlug` parameter is a UUID or an ID by checking `isUuid || idOrSlug.startsWith('c')`. The `startsWith('c')` heuristic assumes all non-UUID course IDs begin with the letter "c". Any course slug that happens to start with "c" (e.g., `creative-writing`, `css-fundamentals`) will be incorrectly treated as an ID, causing the query to match against the `id` column instead of the `slug` column, resulting in a "Course not found" error.

**Code:**
```ts
// services/api/courses.api.ts:126
if (isUuid || idOrSlug.startsWith('c')) {
  query = query.eq('id', idOrSlug);
} else {
  query = query.eq('slug', idOrSlug);
}
```

**Suggested fix:**
Remove the `startsWith('c')` branch entirely and rely solely on UUID detection. If the value is a valid UUID, query by `id`; otherwise, query by `slug`. An alternative is to try both in sequence (query by `id` first, then fall back to `slug`):
```ts
if (isUuid) {
  query = query.eq('id', idOrSlug);
} else {
  query = query.eq('slug', idOrSlug);
}
```

---

### 3. `reviews.api.ts` fetches ALL reviews twice for summary stats

| | |
|---|---|
| **Severity** | Medium |
| **Priority** | Medium |
| **File** | `services/api/reviews.api.ts` (lines 43-69) |

**Description:**
`getCourseReviews` already fetches reviews with `{ count: 'exact' }` on line 48, which returns the total count via PostgREST without transferring all rows. However, a second unbounded query on lines 55-58 fetches every review for the course just to compute the average rating and rating distribution. For courses with many reviews, this transfers unnecessary data over the network.

**Code:**
```ts
// First query (lines 43-51) - paginated, already has count
const { data: reviews, error, count } = await supabase
  .from('reviews')
  .select(`...`, { count: 'exact' })
  .eq('course_id', courseId)
  .range(offset, offset + limit - 1);

// Second query (lines 55-58) - fetches ALL reviews again
const { data: allReviews } = await supabase
  .from('reviews')
  .select('rating')
  .eq('course_id', courseId);
```

**Suggested fix:**
Create a Postgres RPC function (or a database view) that computes the summary stats (average rating, rating distribution, total count) server-side, returning a single row. This eliminates the double-fetch entirely:
```sql
CREATE FUNCTION get_review_summary(p_course_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'total', count(*),
    'average', coalesce(avg(rating), 0),
    'distribution', json_build_object(
      '5', count(*) filter (where rating = 5),
      '4', count(*) filter (where rating = 4),
      '3', count(*) filter (where rating = 3),
      '2', count(*) filter (where rating = 2),
      '1', count(*) filter (where rating = 1)
    )
  ) FROM reviews WHERE course_id = p_course_id;
$$ LANGUAGE sql STABLE;
```

---

## Security

### 4. Dev credentials hardcoded in production bundle (Medium)

| | |
|---|---|
| **Severity** | Medium |
| **Priority** | Medium |
| **File** | `context/AuthContext.tsx` (lines 133-165) |

**Description:**
The `loginDev` function contains hardcoded credentials (`admin@eyebuckz.com` / `dev-password-123`) that ship in the production JavaScript bundle. Anyone inspecting the minified source can extract these credentials and use them to authenticate as the admin dev user against the production Supabase instance. Additionally, the function promotes the signed-in user to `ADMIN` role via a direct `users` table update (line 173), which compounds the risk if RLS does not prevent self-promotion (see issue #5).

**Code:**
```ts
// context/AuthContext.tsx:133-135
const loginDev = async (isAdmin: boolean = false) => {
  const email = isAdmin ? 'admin@eyebuckz.com' : 'test@example.com';
  const password = 'dev-password-123';
  // ...
  // Line 172-174: promotes user to ADMIN
  if (isAdmin) {
    await supabase.from('users').update({ role: 'ADMIN' }).eq('id', data.session.user.id);
  }
};
```

**Suggested fix:**
- Gate the entire `loginDev` function behind a build-time environment check so it is tree-shaken from production builds:
  ```ts
  const loginDev = import.meta.env.DEV
    ? async (isAdmin?: boolean) => { /* ... */ }
    : async () => { throw new Error('Dev login is not available in production'); };
  ```
- Alternatively, remove `loginDev` from the production build entirely using a Vite plugin or conditional import.
- Ensure the dev credentials do not exist in the production Supabase auth database.

---

### 5. No RLS preventing admin role self-promotion (Low)

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **File** | `context/AuthContext.tsx` (lines 172-174), RLS policies in `supabase/migrations/` |

**Description:**
The `loginDev` function updates the `role` column on the `users` table from the client side using the anon/authenticated Supabase client. If the RLS policy on the `users` table allows authenticated users to update their own row without restricting which columns can be modified, any user could set their own `role` to `'ADMIN'` by crafting a similar Supabase query from the browser console or an API client.

**Suggested fix:**
Add a column-level restriction in the RLS update policy for the `users` table that prevents non-admin users from modifying the `role` column:
```sql
CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Non-admins cannot change their role
    (role = (SELECT role FROM users WHERE id = auth.uid()))
    OR
    (SELECT is_admin())
  );
```
Alternatively, move admin role assignment to a server-side Edge Function that validates authorization.

---

### 6. Filter injection in `admin.api.ts` `.or()` string interpolation (Low)

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **File** | `services/api/admin.api.ts` (lines 54, 647-649, 724) |

**Description:**
The admin API builds PostgREST `.or()` filter strings by directly interpolating user-provided search input without sanitization. While PostgREST is not SQL and this does not enable SQL injection, a crafted search string containing PostgREST filter syntax characters (commas, parentheses, dots) could alter the filter logic, potentially exposing unintended data or causing query errors.

**Code:**
```ts
// admin.api.ts:54 (getUsers)
query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);

// admin.api.ts:647-649 (getPayments)
query = query.or(
  `receipt_number.ilike.%${params.search}%,razorpay_payment_id.ilike.%${params.search}%`
);

// admin.api.ts:724 (getReviews)
query = query.or(`comment.ilike.%${params.search}%`);
```

The same pattern also appears in `services/api/payments.api.ts` (lines 105-107).

**Suggested fix:**
Sanitize the search input by escaping or stripping PostgREST special characters before interpolation:
```ts
function sanitizeSearch(input: string): string {
  return input.replace(/[%_(),.*]/g, '');
}
```
Alternatively, use individual `.ilike()` calls chained with Supabase's filter methods instead of string-based `.or()`.

---

## Technical Debt

### 7. `supabase.ts` types include dropped `sessions` and `refresh_tokens` tables

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **File** | `types/supabase.ts` (lines 454-538) |

**Description:**
The manually maintained `types/supabase.ts` file includes type definitions for `sessions` (lines 454-500) and `refresh_tokens` (lines 501-538) tables. These tables were part of the old custom JWT auth system and were dropped during the migration to Supabase Auth, which manages its own sessions internally. The stale type definitions give the false impression that these tables exist and could lead developers to write queries against non-existent tables.

**Suggested fix:**
Remove the `sessions` and `refresh_tokens` table type definitions. Also consider removing `login_attempts` (lines 539-579) if that table was also part of the old auth system. Regenerate types using `supabase gen types typescript --local > types/supabase.ts` to ensure accuracy.

---

### 8. No server state caching (manual `useEffect`/`useState` everywhere)

| | |
|---|---|
| **Severity** | Medium |
| **Priority** | Medium |
| **Files** | All page components (`pages/Dashboard.tsx`, `pages/Learn.tsx`, `pages/Profile.tsx`, `pages/Storefront.tsx`, etc.) |

**Description:**
Every page that fetches data uses raw `useEffect` + `useState` patterns with no caching, deduplication, or background refetch. This means:
- Navigating away from a page and returning triggers a full re-fetch every time
- Multiple components fetching the same data (e.g., user profile, course list) create redundant network requests
- There is no stale-while-revalidate behavior, so page transitions always show loading spinners
- Error retry logic must be manually implemented in each component

**Suggested fix:**
Adopt a server state library such as TanStack Query (React Query) or SWR. This provides automatic caching, request deduplication, background refetching, stale-while-revalidate, and built-in retry/error handling. Migrate incrementally, starting with the most frequently accessed queries (courses, enrollments, user profile).

---

### 9. No error boundaries around admin pages

| | |
|---|---|
| **Severity** | Low |
| **Priority** | Low |
| **Files** | `pages/admin/AdminLayout.tsx`, `pages/admin/AdminRoutes.tsx` |

**Description:**
Admin pages perform complex operations (course CRUD, user management, payment processing, certificate issuance) but have no React error boundary wrapping them. An unhandled exception in any admin sub-page (e.g., a malformed API response, a null reference in a mapping function) will crash the entire admin panel, requiring a full page reload and losing any in-progress work.

**Suggested fix:**
Add a React error boundary component around the admin route outlet in `AdminLayout.tsx`:
```tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

// In AdminLayout render:
<ErrorBoundary fallback={<AdminErrorFallback />}>
  <Outlet />
</ErrorBoundary>
```
The fallback should display the error message and provide a "Go to Admin Dashboard" link so the admin can recover without a full reload.

---

## Resolved Issues

Issues below were resolved during the codebase standardization refactor (March 2026).

### R1. `BundleCoursePicker` used `(c as any)` type assertions

**Resolution:** The `AdminCourse` type now includes `deletedAt` and `_count` fields, eliminating the need for `any` casts.

---

### R2. `Dashboard.tsx` bypassed API layer with direct Supabase queries

**Resolution:** A new `coursesApi.getCoursesByIds()` method was added. Dashboard now imports from `services/api` instead of querying Supabase directly.

---

### R3. Duplicate refund logic between `admin.api.ts` and `payments.api.ts`

**Resolution:** `adminApi.processRefund` now delegates to `paymentsApi.processRefund()` instead of calling the Edge Function directly.

---

### R4. Duplicate user-mapping logic in `AuthContext` and `users.api.ts`

**Resolution:** A shared `mapUserProfile` function is now exported from `users.api.ts` and used by both `AuthContext` and `usersApi`.

---

### R5. Notification mapping duplicated in `useRealtimeNotifications` and `notifications.api.ts`

**Resolution:** `mapNotification` is now exported from `notifications.api.ts` and imported by the `useRealtimeNotifications` hook.

---

### R6. `dataExport.ts` references removed localStorage keys (dead code)

**Resolution:** The file `utils/dataExport.ts` was deleted entirely.

---

### R7. Heavy `any` usage in `admin.api.ts`

**Resolution:** 30+ `any` types replaced with proper typed interfaces (`AdminCourse`, `AdminUser`, `AdminPayment`, etc.) throughout the module.

---

### R8. `helpful` vs `helpful_count` field naming mismatch in reviews

**Resolution:** The select query in `reviews.api.ts` was fixed to use `helpful_count`. The mapper converts the DB column `helpful_count` to the frontend field `helpful` for consistency.
