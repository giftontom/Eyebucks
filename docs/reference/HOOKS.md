# Hooks Reference

This document covers all custom React hooks in the Eyebuckz LMS frontend: 4 shared hooks and 3 admin hooks.

---

## Shared Hooks (`hooks/`)

All shared hooks are exported via the `hooks/index.ts` barrel file.

---

### 1. useAccessControl

Checks whether the current user has access to a specific course.

```tsx
import { useAccessControl } from '../hooks';

function useAccessControl(courseId: string): {
  hasAccess: boolean;
  isLoading: boolean;
  isEnrolled: boolean;
  isAdmin: boolean;
  checkEnrollment: () => Promise<void>;
};
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `courseId` | `string` | The course ID to check access for. |

**Return Value:**
| Field | Type | Description |
|-------|------|-------------|
| `hasAccess` | `boolean` | `true` if user is enrolled or is an admin. |
| `isLoading` | `boolean` | `true` while the access check is in progress. |
| `isEnrolled` | `boolean` | `true` if user has an active enrollment for this course. |
| `isAdmin` | `boolean` | `true` if the user has an admin role. |
| `checkEnrollment` | `() => Promise<void>` | Manually re-check enrollment status. |

**Dependencies:** `useAuth()`, `enrollmentsApi.checkAccess()`.

**Behavior:**
- On mount (and when `courseId` changes), calls `enrollmentsApi.checkAccess()` to verify enrollment.
- Admin users always have `hasAccess: true` regardless of enrollment status.
- Call `checkEnrollment()` to manually refresh after a purchase or enrollment change.

---

### 2. useScript

Dynamically loads an external script tag with deduplication.

```tsx
import { useScript, useGlobalExists } from '../hooks';

function useScript(src: string): boolean;
function useGlobalExists(globalName: string): boolean;
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `src` | `string` | The URL of the script to load. |

**Return Value:**
| Type | Description |
|------|-------------|
| `boolean` | `true` once the script has finished loading. |

**Companion Export -- `useGlobalExists`:**
| Name | Type | Description |
|------|------|-------------|
| `globalName` | `string` | Name of the global variable to check (e.g., `'Razorpay'`). |
| Returns | `boolean` | `true` if `window[globalName]` exists. |

**Behavior:**
- Appends a `<script>` tag to `document.body` if one with the same `src` does not already exist.
- Returns `true` when the script's `onload` event fires.
- Multiple calls with the same `src` share the same script element (deduplication).
- `useGlobalExists` polls for the presence of a global variable, useful for scripts that expose globals asynchronously.

---

### 3. useVideoUrl

Fetches signed video URLs from the `video-signed-url` Edge Function.

```tsx
import { useVideoUrl } from '../hooks';

function useVideoUrl(
  videoId?: string,
  moduleId?: string,
  fallbackUrl?: string
): {
  videoUrl: string | null;
  hlsUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
};
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `videoId` | `string \| undefined` | Bunny.net video GUID. |
| `moduleId` | `string \| undefined` | Module ID (used if `videoId` is not available). |
| `fallbackUrl` | `string \| undefined` | URL to use if signed URL fetch fails. |

**Return Value:**
| Field | Type | Description |
|-------|------|-------------|
| `videoUrl` | `string \| null` | Direct video URL (signed). |
| `hlsUrl` | `string \| null` | HLS playlist URL (signed) for adaptive streaming. |
| `isLoading` | `boolean` | `true` while the URL is being fetched. |
| `error` | `string \| null` | Error message if the fetch failed. |
| `refreshUrl` | `() => Promise<void>` | Manually refresh the signed URL. |

**Dependencies:** Supabase client (for Edge Function invocation and auth token).

**Behavior:**
- Immediately sets `hlsUrl` to `fallbackUrl` (Referer-based CDN access) so video can begin loading before the signed URL arrives.
- Calls the `video-signed-url` Edge Function in the background; on success, upgrades `hlsUrl` to the signed URL.
- If signing fails and `fallbackUrl` is available, keeps using the CDN URL silently (does **not** set `error` — avoids false error display when the CDN URL is functional).
- Includes auth retry logic: if the JWT is expired, attempts a session refresh before retrying the Edge Function call.
- Automatically schedules a refresh 5 minutes before the signed URL expires to prevent mid-session expiry.
- Cleans up the refresh timer on unmount.

---

### 4. useRealtimeNotifications

Fetches notifications and subscribes to real-time updates via Supabase Realtime.

```tsx
import { useRealtimeNotifications } from '../hooks';

function useRealtimeNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};
```

**Return Value:**
| Field | Type | Description |
|-------|------|-------------|
| `notifications` | `Notification[]` | Array of the user's notifications (newest first). |
| `unreadCount` | `number` | Count of notifications where `read_at` is null. |
| `isLoading` | `boolean` | `true` during initial fetch. |
| `markAsRead` | `(id: string) => Promise<void>` | Mark a single notification as read. |
| `markAllAsRead` | `() => Promise<void>` | Mark all notifications as read. |
| `refresh` | `() => Promise<void>` | Manually re-fetch all notifications. |

**Dependencies:** Supabase client, `useAuth()`, `mapNotification` from `notifications.api.ts`.

**Behavior:**
- On mount, fetches the 50 most recent notifications for the authenticated user.
- Row mapping uses the shared `mapNotification()` function for consistency with REST fetches.
- Subscribes to the `notifications` table via Supabase Realtime, listening for `INSERT` events filtered by the user's ID.
- New notifications are prepended to the list in real time.
- `unreadCount` updates automatically as notifications arrive or are marked as read.
- The Realtime subscription is cleaned up on unmount.

---

## Admin Hooks (`pages/admin/hooks/`)

These hooks are used exclusively within the admin panel.

---

### 5. useDebounce\<T\>

Generic debounce hook for any value type.

```tsx
import { useDebounce } from '../hooks/useDebounce';

function useDebounce<T>(value: T, delay?: number): T;
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T` | -- | The value to debounce. |
| `delay` | `number` | `400` | Debounce delay in milliseconds. |

**Return Value:**
| Type | Description |
|------|-------------|
| `T` | The debounced value. Updates only after `delay` ms of inactivity. |

**Behavior:**
- Returns the initial `value` immediately.
- After each change to `value`, waits `delay` ms before updating the returned value.
- Resets the timer if `value` changes again within the delay window.
- Cleans up the timeout on unmount.

**Usage:**
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  // API call only fires after 300ms of no typing
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

---

### 6. usePagination

Manages pagination state for admin data tables.

```tsx
import { usePagination } from '../hooks/usePagination';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function usePagination(limit?: number): {
  pagination: PaginationState;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
};
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | `number` | `10` (typical) | Number of items per page. |

**Return Value:**
| Field | Type | Description |
|-------|------|-------------|
| `pagination` | `PaginationState` | Current pagination state object. |
| `setPage` | `(page: number) => void` | Jump to a specific page. |
| `setTotal` | `(total: number) => void` | Update total item count (recalculates `totalPages`). |
| `nextPage` | `() => void` | Go to next page (no-op if on last page). |
| `prevPage` | `() => void` | Go to previous page (no-op if on first page). |
| `reset` | `() => void` | Reset to page 1. |

**Behavior:**
- Initializes at page 1 with the given `limit`.
- `totalPages` is computed as `Math.ceil(total / limit)`.
- `nextPage` and `prevPage` are bounded to valid page ranges.
- Call `setTotal` after fetching data to keep pagination in sync with the backend count.

---

### 7. useAdminData\<T\>

Generic data fetching hook with loading and error states for admin pages.

```tsx
import { useAdminData } from '../hooks/useAdminData';

interface UseAdminDataOptions<T> {
  fetchFn: () => Promise<T>;
  deps?: any[];
  autoFetch?: boolean;       // default: true
}

function useAdminData<T>(options: UseAdminDataOptions<T>): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `fetchFn` | `() => Promise<T>` | -- | Async function that returns the data. |
| `deps` | `any[]` | `[]` | Dependency array -- refetches when any value changes. |
| `autoFetch` | `boolean` | `true` | Whether to fetch on mount and dep changes. |

**Return Value:**
| Field | Type | Description |
|-------|------|-------------|
| `data` | `T \| null` | The fetched data, or `null` if not yet loaded. |
| `loading` | `boolean` | `true` while the fetch is in progress. |
| `error` | `string \| null` | Error message if the fetch failed. |
| `refetch` | `() => Promise<void>` | Manually trigger a refetch. |

**Behavior:**
- When `autoFetch` is true (default), calls `fetchFn` on mount and whenever `deps` change.
- Sets `loading` to true at the start of each fetch and resets `error`.
- On success, sets `data` to the result and `loading` to false.
- On failure, sets `error` to the error message and `loading` to false.
- Call `refetch` to manually re-run the fetch (e.g., after a mutation).
- Handles component unmount to avoid setting state on unmounted components.

**Usage:**
```tsx
const { data: users, loading, error, refetch } = useAdminData({
  fetchFn: () => adminApi.getUsers({ page: 1, limit: 20 }),
  deps: [page, searchQuery],
});
```
