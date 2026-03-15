# PERFORMANCE_GUIDE

> **Last updated:** 2026-03-14 | **Status:** Stable | **Audience:** Developers, DevOps

## Table of Contents

1. [Current Bundle Profile](#1-current-bundle-profile)
2. [Code Splitting Strategy](#2-code-splitting-strategy)
3. [Supabase Query Optimization](#3-supabase-query-optimization)
4. [Video Performance](#4-video-performance)
5. [React Rendering Optimization](#5-react-rendering-optimization)
6. [TanStack Query Opportunity](#6-tanstack-query-opportunity)
7. [Measuring Performance](#7-measuring-performance)

---

## 1. Current Bundle Profile

Baseline measurements (Storefront, gzipped):

| Chunk | Size (gzipped) | Load timing |
|-------|---------------|-------------|
| App bundle (Storefront) | ~115KB total | Eager (initial load) |
| — React + React DOM | ~68KB | Eager |
| — Supabase JS | ~173KB (raw) | Eager |
| — Lucide icons | ~29KB | Eager |
| HLS.js | ~523KB (raw) | Lazy (Learn page only) |
| Recharts | ~349KB (raw) | Lazy (Admin only) |
| Sentry | Async | Background |

**The initial page load is well-optimized.** Heavy deps (HLS.js, Recharts) are loaded
on-demand via route-level code splitting.

### Source of baseline

Measurements from Vite bundle analysis (run `/perf-audit` to refresh):
```bash
npm run build -- --mode production
npx vite-bundle-visualizer
```

---

## 2. Code Splitting Strategy

### Current implementation

All protected and admin routes use `React.lazy()`:

```ts
// App.tsx — correct pattern
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Learn = React.lazy(() => import('./pages/Learn'));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
```

### Rules

**DO lazy-load:**
- Protected routes (Dashboard, Learn, Profile, Checkout, PurchaseSuccess)
- Admin routes (all pages under `/admin`)
- Heavy components used on a single page (e.g., Recharts on Admin Dashboard)

**DO NOT lazy-load:**
- `Storefront` — above-the-fold, users see it immediately
- `Layout` — rendered on every page
- `AuthContext`, `ThemeContext` — providers needed before any route renders
- Small components used across multiple pages (Badge, Button, Card, Input)

### Adding new lazy routes

```ts
// Pattern: React.lazy + Suspense fallback
const NewPage = React.lazy(() => import('./pages/NewPage'));

// In router:
<Suspense fallback={<PageLoader />}>
  <Route path="/new-page" element={<NewPage />} />
</Suspense>
```

---

## 3. Supabase Query Optimization

### Never SELECT *

Always select only the columns you need:

```ts
// BAD: transfers all columns including large text fields
const { data } = await supabase.from('courses').select('*');

// GOOD: only what the component renders
const { data } = await supabase
  .from('courses')
  .select('id, title, slug, price, thumbnail, status, rating, total_students');
```

### N+1 anti-pattern in reviews.api.ts

**Known Issue #3:** `reviews.api.ts` makes two queries to compute the average rating:
1. Fetches the requested page of reviews
2. Fetches ALL reviews (unbounded) just to compute the distribution

**Fix:** Use an RPC or a Postgres aggregate in the first query:

```ts
// TODO(#3): Replace second unbounded query with this RPC call
const { data: summary } = await supabase
  .rpc('get_review_summary', { p_course_id: courseId });
```

### Use RPC for aggregations

When you need aggregated data (counts, averages, sums), prefer an RPC over multiple
PostgREST queries:

```ts
// Good: single DB round-trip
const { data: stats } = await supabase
  .rpc('get_progress_stats', { p_user_id: userId, p_course_id: courseId });

// Bad: multiple round-trips + client-side aggregation
const modules = await getAllModules(courseId);
const progress = await getAllProgress(userId, courseId);
const pct = modules.filter(m => progress.find(p => p.module_id === m.id)?.completed).length / modules.length;
```

### Pagination

Always paginate large result sets. Use `.range(from, to)`:

```ts
const PAGE_SIZE = 20;
const { data } = await supabase
  .from('payments')
  .select('id, amount, status, created_at')
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### PostgREST filter injection caution

**Known Issue #6:** Admin search interpolates user input directly into `.or()` calls.
Always escape special characters before interpolation:

```ts
// SECURITY: escape before use in .or() to prevent filter injection
const safe = input.replace(/[(),\\]/g, '\\$&');
query = query.or(`title.ilike.%${safe}%,email.ilike.%${safe}%`);
```

---

## 4. Video Performance

### CDN URL to Signed URL upgrade

`hooks/useVideoUrl.ts` implements a two-phase URL strategy:

1. **Phase 1 (immediate):** Serve the CDN URL (`https://vz-fec6a02b-81b.b-cdn.net/{guid}/playlist.m3u8`)
   based on Referer header. Video starts playing instantly.
2. **Phase 2 (background):** Call `video-signed-url` Edge Function → get SHA256-signed URL.
   Upgrade HLS source to signed URL transparently.

**Never block video playback on signed URL generation.** If the Edge Function is slow or
returns an error, the CDN URL fallback keeps the video playing.

### Auto-refresh timing

Signed URLs expire in 1 hour. `useVideoUrl` schedules a refresh at **55 minutes** (5 minutes
before expiry) to prevent mid-lesson URL expiry.

```ts
// In useVideoUrl.ts
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const expiryMs = SIGNED_URL_EXPIRY_SECONDS * 1000;
setTimeout(refreshUrl, expiryMs - REFRESH_BEFORE_EXPIRY_MS);
```

### HLS.js lazy loading

HLS.js (~523KB raw) is loaded only on the Learn page. It is imported inside
`VideoPlayer.tsx`, which is itself lazy-loaded. Do not import HLS.js in any other file.

---

## 5. React Rendering Optimization

### useCallback and useMemo rules

- **Use `useCallback`** for callbacks passed as props to child components that use
  `React.memo`
- **Use `useMemo`** for expensive computations or derived arrays that should not
  recompute on every render
- **Do NOT use either** as a default for all functions — the overhead of creating
  memoized functions is often higher than just re-creating them

```ts
// Good: callback passed to React.memo child
const handleMarkRead = useCallback((id: string) => {
  markNotificationRead(id);
}, [markNotificationRead]);

// Bad: memoizing a simple calculation
const doubled = useMemo(() => value * 2, [value]); // just write value * 2
```

### Realtime unsubscribe on unmount

Every `supabase.channel()` subscription must be cleaned up in `useEffect` return:

```ts
useEffect(() => {
  const channel = supabase.channel('notifications')
    .on('postgres_changes', { /* ... */ }, handleInsert)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

Missing cleanup causes memory leaks and duplicate event handlers after navigation.

### Avoid re-fetching on every navigation

**Known Issue #8:** There is currently no server state caching. Every navigation to a page
that fetches data (Dashboard, CourseDetails, Admin pages) triggers a full re-fetch.

**Mitigation until TanStack Query is added:**
- Lift shared data to context (e.g., `AdminContext` for admin data)
- Use `useRef` to cache the last fetched value for the session

---

## 6. TanStack Query Opportunity

**Known Issue #8:** The absence of server state caching means:
- Navigating Dashboard → CourseDetails → Dashboard fetches all data twice
- There is no deduplication of in-flight requests
- Stale data is never shown while fresh data loads

**Recommended migration path:**

```ts
// Current pattern (no caching)
const [course, setCourse] = useState<Course | null>(null);
useEffect(() => { coursesApi.getCourse(id).then(setCourse); }, [id]);

// With TanStack Query (caching + deduplication + stale-while-revalidate)
const { data: course, isLoading } = useQuery({
  queryKey: ['course', id],
  queryFn: () => coursesApi.getCourse(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Priority order for migration:**
1. `coursesApi.getPublishedCourses()` — called on Storefront on every visit
2. `coursesApi.getCourse(id)` — called on every CourseDetails navigation
3. Admin dashboard stats — heavy RPC calls not worth re-fetching on every visit

---

## 7. Measuring Performance

### Lighthouse CI

```bash
# Run via Claude Code skill
# /perf-audit
```

**Target scores:**
- Performance: >= 90
- Accessibility: >= 95 (required by WCAG 2.1 AA target)
- Best Practices: >= 90
- SEO: >= 80

### Vite Bundle Analysis

```bash
npm run build
npx vite-bundle-visualizer
# Opens interactive treemap in browser
```

Look for:
- Unexpected large chunks in the initial bundle
- Duplicate packages (e.g., two versions of the same library)
- Missing lazy loading for heavy pages

### Supabase Slow Query Log

Supabase Dashboard → Database → Logs → filter by `> 200ms`.

Common culprits:
- Missing index on FK columns used in JOINs
- Full table scans on `modules` (add index on `course_id`)
- Unbounded queries (reviews.api.ts Known Issue #3)

### Edge Function Performance

```bash
supabase functions logs checkout-verify --limit 100
# Look for invocations > 1000ms
```

Edge Function cold starts can add 200–500ms to the first invocation after an idle period.
Warm invocations should be < 200ms for most functions.
