# Components Reference

> Last updated: 2026-06-22

This document covers all shared components (23) and admin components (12) in the Eyebuckz LMS frontend.

---

## Shared Components (`components/`)

All shared components use **named exports** and are exported via the `components/index.ts` barrel file.

---

### 1. Layout

Main page wrapper providing sticky navigation, mobile drawer, and footer.

```tsx
import { Layout } from '../components';

interface LayoutProps {
  children: ReactNode;
}
```

**Behavior:**
- Renders the top navigation bar with logo, nav links, notification bell, and user menu.
- On mobile, navigation collapses into a hamburger-triggered drawer.
- Footer rendered below content.
- Uses `useAuth()` internally for user state (login/logout, admin detection).

---

### 2. ProtectedRoute

Auth guard that redirects unauthenticated users.

```tsx
import { ProtectedRoute } from '../components';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string; // default: '/login'
}
```

**Behavior:**
- Checks auth state via `useAuth()`.
- If not authenticated, redirects to `redirectTo` path.
- Renders `children` when the user is authenticated.

---

### 3. EnrollmentGate

Upsell screen displayed to non-enrolled users attempting to access course content.

```tsx
import { EnrollmentGate } from '../components';

interface EnrollmentGateProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number;        // in paise (divide by 100 for display)
  courseThumbnail: string;
  courseDescription: string;
  totalModules: number;
}
```

**Behavior:**
- Displays course info (thumbnail, title, description, module count, price).
- Renders an "Enroll Now" CTA that initiates the Razorpay checkout flow.
- Only shown when the user is authenticated but not enrolled.

---

### 4. ErrorBoundary

Class component that catches rendering errors in its subtree.

```tsx
import { ErrorBoundary, withErrorBoundary } from '../components';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
```

**Exports (named only, no default export):**
- `ErrorBoundary` -- class component wrapping `children`.
- `withErrorBoundary(Component)` -- HOC that wraps any component in an ErrorBoundary.

**Behavior:**
- Catches errors via `componentDidCatch`.
- Reports errors to Sentry.
- Renders `fallback` if provided, otherwise a default error UI.

---

### 5. VideoPlayer

HLS video player integrated with Bunny.net Stream via signed URLs.

```tsx
import { VideoPlayer } from '../components';
import type { VideoPlayerHandle } from '../components/VideoPlayer';

interface VideoPlayerProps {
  videoId?: string;        // Bunny.net video GUID (not a URL)
  moduleId?: string;       // Database module UUID — for enrollment verification
  fallbackUrl: string;     // CDN URL used as fallback if signing fails
  className?: string;
  controls?: boolean;
  onTimeUpdate?: () => void;
  onClick?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
  onQualityChange?: (quality: string) => void;
  onLevelsLoaded?: (levels: QualityLevel[]) => void;
}

// Ref handle (use with React.useRef<VideoPlayerHandle>)
interface VideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
  refreshUrl: () => Promise<void>;
  requestPiP: () => Promise<void>;
  setQualityLevel: (index: number) => void;  // -1 for auto
  currentTime: number;    // settable
  duration: number;
  paused: boolean;
  volume: number;         // settable, 0–1
  muted: boolean;         // settable
  src: string;            // settable
  parentElement: HTMLElement | null;
  playbackRate: number;   // settable
  buffered: number;       // end of buffered range in seconds
}
```

**Behavior:**
- Uses `useVideoUrl` to fetch a SHA256-signed Bunny CDN URL. Does not serve unsigned CDN URLs (Bunny token auth enabled — unsigned URLs return 403).
- Initializes HLS.js for adaptive bitrate streaming in non-Safari browsers; falls back to native HLS for Safari.
- Path-based Bunny token (`bcdn_token=X` in URL path) propagates automatically to all HLS.js sub-requests (sub-manifests, `.ts` segments).
- On URL refresh (same module, new signed URL): swaps source in-place via `hls.loadSource()`, preserving current playback position.
- `hlsErrorFiredRef` is set at the start of any fatal HLS error to prevent the native `<video> onError` handler from duplicating the error message during HLS recovery.
- Exposes imperative API via `React.forwardRef` + `useImperativeHandle`.
- Auto-refreshes signed URLs 5 minutes before expiry via `useVideoUrl`.
- CSP requirement: `media-src 'self' blob: https://*.b-cdn.net; worker-src blob:;` must be set — HLS.js uses MediaSource API which creates `blob:` URLs.

---

### 6. VideoUploader

TUS-based drag-and-drop video uploader for admin use.

```tsx
import { VideoUploader } from '../components';

interface VideoUploadData {
  videoId: string;
  videoUrl: string;
  // additional metadata from upload response
}

interface VideoUploaderProps {
  onUploadComplete: (videoData: VideoUploadData) => void;
  initialVideoUrl?: string;
  disabled?: boolean;
}
```

**Behavior:**
- Drag-and-drop zone or click-to-select file input.
- Uploads via TUS protocol using `tus-js-client`.
- Shows upload progress bar.
- Calls `onUploadComplete` with video metadata when finished.
- Displays existing video preview when `initialVideoUrl` is set.

---

### 7. ImageUpload

Drag-and-drop CMS image uploader for admin use.

```tsx
import { ImageUpload } from '../components';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  disabled?: boolean;
}
```

**Behavior:**
- Drag-and-drop zone or click-to-select file input (images only).
- Invokes `siteImagesApi.uploadImage()` which calls the `admin-image-upload` Edge Function.
- Returns the Bunny Storage Pull-Zone CDN URL via `onUploadComplete`.
- Shows upload progress and a thumbnail preview of `currentUrl` when set.
- Barrel-exported from `components/index.ts`.

---

### 7a. AssetCard

Product card for a digital asset in the `/assets` shop and homepage showcase section.

```tsx
import { AssetCard } from '../components';

interface AssetCardProps {
  asset: DigitalAsset;
  onBuy?: (asset: DigitalAsset) => void;
  owned?: boolean;
}
```

**Behavior:**
- Renders asset thumbnail, title, file type badge (`asset_file_type`), license label, and formatted price.
- When `owned` is `true`, shows a "Download" CTA instead of "Buy".
- `onBuy` is called when the purchase/claim CTA is clicked.

---

### 7b. AssetUploader

Signed-URL direct upload component for admin digital asset files. Mirrors the `VideoUploader` pattern but targets Supabase Storage instead of Bunny TUS.

```tsx
import { AssetUploader } from '../components';

interface AssetUploaderProps {
  onUploadComplete: (storagePath: string, fileSize: number, fileExt: string) => void;
  disabled?: boolean;
}
```

**Behavior:**
- Drag-and-drop zone or click-to-select file input (any file type; max 2 GB).
- Calls `admin-asset-upload` Edge Function to obtain a Supabase Storage signed upload URL.
- Uploads directly to the `digital-assets` private bucket using the signed URL (no binary passes through the Edge Function).
- Shows upload progress bar.
- Calls `onUploadComplete` with `storagePath`, `fileSize` (bytes), and `fileExt` (without dot) on completion.

---

### 7c. OwnedAssetsTab

"Library" tab component rendered inside the Dashboard (`/dashboard`). Displays the authenticated user's purchased and claimed digital assets.

```tsx
import { OwnedAssetsTab } from '../components';

// No props — reads owned assets via digitalAssetsApi.getOwnedAssets() internally
```

**Behavior:**
- Fetches `AssetPurchaseWithAsset[]` from `digitalAssetsApi.getOwnedAssets()` on mount.
- Renders a grid of asset cards with "Download" CTA.
- On download click, calls `digitalAssetsApi.getDownloadUrl(assetId)` which invokes the `asset-download-url` Edge Function.
- Opens the short-lived signed URL in a new tab.
- Shows an empty state when no assets are owned.

---

### 8. NotificationBell

Real-time notification dropdown in the navigation bar.

```tsx
import { NotificationBell } from '../components';

// No props -- uses hooks internally
```

**Behavior:**
- Renders a bell icon with an unread count badge.
- Dropdown lists recent notifications.
- Uses `useRealtimeNotifications` for live updates via Supabase Realtime.
- Supports mark-as-read (individual and bulk).

---

### 9. Toast

Dismissible toast notification system.

```tsx
import { Toast, useToast } from '../components';

// Toast component props
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info'; // default: 'info'
  onClose?: () => void;
}

// useToast hook return
interface UseToastReturn {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  ToastContainer: React.FC;
}
```

**Usage:**
```tsx
function MyComponent() {
  const { showToast, ToastContainer } = useToast();

  return (
    <>
      <button onClick={() => showToast('Saved!', 'success')}>Save</button>
      <ToastContainer />
    </>
  );
}
```

---

### 10. Catalog filtering & search

Course filtering, search, and sort live **inline in `components/sections/CatalogSection.tsx`** and are driven **server-side** through `coursesApi.getCourses(options)` — the query (not the client) applies `type`, `search`, `minRating`, `maxPrice`, and `sort`, so results cover the whole catalog rather than just a loaded page.

```ts
getCourses({ page, pageSize, type, search, minRating, maxPrice, sort });
// sort: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'
```

> The former standalone `SearchBar` / `CourseFilters` components and the `useStorefrontFilters` hook were removed — they had drifted out of use once `CatalogSection` took over filtering inline.

---

### 11. CourseCardSkeleton

Loading skeleton placeholders for course cards and dashboard.

```tsx
import { CourseCardSkeleton, DashboardSkeleton } from '../components';

// CourseCardSkeleton -- no props
// DashboardSkeleton -- no props (renders a 3-column grid of skeletons)
```

**Behavior:**
- `CourseCardSkeleton` mirrors the catalog `CourseCard` shape exactly (aspect-[4/3] thumb → meta row → 2-line title → description → price/CTA row) so there is **no layout shift** when real cards load.
- `EnrolledCourseSkeleton` mirrors the Dashboard enrolled-course card (thumb → title → progress bar).
- `DashboardSkeleton` renders a header + a 3-column grid of `EnrolledCourseSkeleton` for the dashboard loading state.

---

### 12. ReviewForm

Course review submission form.

```tsx
import { ReviewForm } from '../components';

interface ReviewFormProps {
  courseId: string;
  onSubmit: (rating: number, comment: string) => void | Promise<void>;
  onCancel?: () => void;
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
}
```

**Behavior:**
- Star rating selector + comment textarea.
- Pre-fills with `initialRating` and `initialComment` when editing.
- Submit button label changes based on `isEditing` flag.
- Calls `onSubmit` with the rating and comment values.

---

### 13. ReviewList

Reviews display with summary statistics and pagination.

```tsx
import { ReviewList } from '../components';

interface ReviewListProps {
  courseId: string;
  canReview?: boolean;
  onReviewSubmitted?: () => void;
}
```

**Behavior:**
- Fetches and displays reviews for the given course.
- Shows rating summary (average, distribution).
- Paginated review list.
- If `canReview` is true, renders a ReviewForm for new submissions.
- Users can edit or delete their own reviews.
- Calls `onReviewSubmitted` after a successful submission.

---

### 14. StarRating

Interactive or readonly star rating display.

```tsx
import { StarRating } from '../components';

interface StarRatingProps {
  value: number;              // 0 to 5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg'; // default: 'md'
  showValue?: boolean;        // display numeric value next to stars
}
```

**Behavior:**
- Renders 5 stars, filled proportionally to `value`.
- When not `readonly`, stars are clickable and call `onChange`.
- Hover preview effect in interactive mode.
- `showValue` appends the numeric rating (e.g., "4.5") beside the stars.

---

### 15. Badge

Color-coded pill label for status, categories, and counts. See [Design System](DESIGN_SYSTEM.md) for full token reference.

```tsx
import { Badge, statusToVariant } from '../components';
import type { BadgeVariant, BadgeSize } from '../components/Badge';

interface BadgeProps {
  variant?: BadgeVariant; // 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'default' | 'outline'
  size?: BadgeSize;       // 'sm' (default) | 'md'
  dot?: boolean;          // render a coloured dot before the label
  className?: string;
  children: ReactNode;
}
```

**Behavior:**
- Renders a pill (`rounded-full`) with variant-specific background, text, and border colours via CSS token utilities.
- `dot` renders a small filled circle coloured to match the variant.
- `statusToVariant(status)` helper maps DB status strings (e.g., `'PUBLISHED'`, `'captured'`) to the correct variant.

---

### 16. Button

Accessible button with loading state, icon slots, and multiple variants. Forwards a ref.

```tsx
import { Button } from '../components';
import type { ButtonVariant, ButtonSize } from '../components/Button';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: ButtonSize;       // 'sm' | 'md' (default) | 'lg' | 'icon'
  loading?: boolean;       // shows Loader2 spinner; disables the button
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;   // hidden while loading
  fullWidth?: boolean;
}
```

**Behavior:**
- `loading` replaces `leftIcon` with an animated `Loader2` spinner and sets `disabled`.
- Size `'icon'` is square (`p-2 rounded-lg`) for icon-only toolbar buttons — always provide `aria-label`.
- Includes `focus-visible:ring-2 ring-brand-500` for keyboard accessibility.

---

### 17. Input

Labeled form input with error, hint, and leading/trailing icon slots. Forwards a ref.

```tsx
import { Input } from '../components';
import type { InputProps } from '../components/Input';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;           // renders red message below; applies danger border
  hint?: string;            // renders muted message below (only when no error)
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg'; // default: 'md'
  containerClassName?: string;
}
```

**Behavior:**
- When `error` is set, the border changes to `--status-danger-border` and a red message renders below.
- When `hint` is set (and no error), a muted `t-text-3` message renders below.
- Icons are absolutely positioned inside the input and do not affect padding — the input automatically adds `pl-10` / `pr-10` when icons are present.

---

### 18. Card

Surface container with optional bordered header and footer slots.

```tsx
import { Card } from '../components';
import type { CardProps } from '../components/Card';

interface CardProps {
  variant?: 'default' | 'glass'; // default: 'default'
  radius?: 'lg' | 'xl' | '2xl' | '3xl'; // default: '2xl'
  padding?: 'none' | 'sm' | 'md' | 'lg'; // default: 'md'
  header?: ReactNode; // rendered in a px-6 py-4 bordered header strip
  footer?: ReactNode; // rendered in a px-6 py-4 bordered footer strip
  className?: string;
  children: ReactNode;
}
```

**Behavior:**
- `default` variant uses `--surface` background and `--border` border (adapts to dark mode).
- `glass` variant uses `bg-white/5 border-white/10 backdrop-blur-sm` for dark hero sections.
- `padding="none"` renders `children` directly (no wrapper div) — useful for full-bleed images.
- `header` and `footer` are separated from the body by a `t-border border-b / border-t`.

---

## Admin Components (`pages/admin/components/`)

These components are used exclusively within the admin panel. All admin components use **default exports**.

---

### 1. AdminSidebar

Navigation sidebar for the admin panel with mobile drawer support.

```tsx
import AdminSidebar from '../components/AdminSidebar';

// No configurable props -- reads route state internally
```

**Navigation Links:**
- Dashboard
- Courses
- Users
- Certificates
- Content
- Payments
- Reviews

**Behavior:**
- Highlights the active route.
- Collapses into a mobile drawer on smaller screens.

---

### 2. DataTable\<T\>

Generic sortable and paginated data table.

```tsx
import DataTable from '../components/DataTable';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: keyof T | ((item: T) => string);
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}
```

**Behavior:**
- Renders a table with sortable column headers (click to toggle sort).
- Pagination controls at the bottom when `pagination` is provided.
- Shows a loading skeleton when `loading` is true.
- Displays `emptyMessage` when `data` is empty.

---

### 3. StatusBadge

Color-coded badge for displaying entity status. Delegates to the shared `Badge` component using `statusToVariant()`.

```tsx
import StatusBadge from '../components/StatusBadge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}
```

**Behavior:**
- Calls `statusToVariant(status)` from `components/Badge.tsx` to resolve the correct `Badge` variant.
- All colours are driven by CSS token utilities (`t-status-*`), so they automatically adapt to dark mode.
- For the full status-to-variant mapping, see [statusToVariant() Reference](DESIGN_SYSTEM.md#statustovariant-reference).

---

### 4. AdminModal

Generic modal dialog for admin pages.

```tsx
import AdminModal from '../components/AdminModal';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;  // CSS max-width value
  zIndex?: number;
}
```

**Behavior:**
- Renders a centered overlay modal with backdrop.
- Title bar with close button.
- Body renders `children`.
- Closes on backdrop click and Escape key.
- Customizable width via `maxWidth` and stacking via `zIndex`.

---

### 5. ConfirmDialog

Confirmation modal for destructive or important actions.

```tsx
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;   // default: 'Confirm'
  loading?: boolean;
}
```

**Behavior:**
- Displays a modal with `title`, `message`, and optional `warning` text.
- Two buttons: Cancel (`Button secondary`, calls `onClose`) and Confirm (`Button danger`, calls `onConfirm`).
- Confirm button shows a spinner when `loading` is true.

---

### 6. StatsCard

Dashboard statistic display card.

```tsx
import StatsCard from '../components/StatsCard';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;           // Lucide icon or similar
  iconBg: string;            // Tailwind bg class (e.g., 'bg-blue-100')
  subtitleColor?: string;    // Tailwind text color class
}
```

**Behavior:**
- Renders a card with an icon (in a colored circle), a label, a large value, and an optional subtitle.
- Used on the admin dashboard for metrics like total revenue, active users, etc.

---

### 7. SalesChart

Area chart for displaying sales data over time.

```tsx
import SalesChart from '../components/SalesChart';

interface SalesDataPoint {
  date: string;
  amount: number;
}

interface SalesChartProps {
  salesData: SalesDataPoint[];
  onPeriodChange: (days: number) => void;
}
```

**Dependencies:** Recharts (`AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`).

**Behavior:**
- Renders a responsive area chart of sales over time.
- Period selector (e.g., 7 days, 30 days, 90 days) calls `onPeriodChange` to refetch data.

---

### 8. ActivityFeed

Recent activity display for the admin dashboard.

```tsx
import ActivityFeed from '../components/ActivityFeed';

interface RecentActivity {
  enrollments: Array<{ user: string; course: string; date: string }>;
  completions: Array<{ user: string; course: string; date: string }>;
  // additional activity types
}

interface ActivityFeedProps {
  activity: RecentActivity;
}
```

**Behavior:**
- Renders a chronological list of recent platform activity (enrollments, completions, etc.).
- Each item shows user, action, course, and timestamp.

---

### 9. QuickActions

Quick action button panel for the admin dashboard.

```tsx
import QuickActions from '../components/QuickActions';

// No configurable props -- uses navigation internally
```

**Actions:**
- **New Course** -- navigates to course creation.
- **Manage Users** -- navigates to users page.
- **Certificates** -- navigates to certificates page.
- **Content** -- navigates to site content editor.

---

### 10. BundleCoursePicker

Multi-select interface for choosing courses to include in a bundle.

```tsx
import BundleCoursePicker from '../components/BundleCoursePicker';

interface AdminCourse {
  id: string;
  title: string;
  // additional course fields
}

interface BundleCoursePickerProps {
  courses: AdminCourse[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}
```

**Behavior:**
- Lists all available courses with checkboxes.
- Pre-checks courses matching `selectedIds`.
- Calls `onChange` with the updated array of selected course IDs on toggle.

---

### 11. CourseForm

Course creation and editing form.

```tsx
import CourseForm from '../components/CourseForm';

interface CourseFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  status: 'DRAFT' | 'PUBLISHED';
  type: 'MODULE' | 'BUNDLE';
  // additional course fields
}

interface CourseFormProps {
  formData: CourseFormData;
  onChange: (data: CourseFormData) => void;
  bundledCourseIds: string[];
  onBundledCourseIdsChange: (ids: string[]) => void;
  courses: AdminCourse[];
}
```

**Behavior:**
- Form fields for all course metadata (title, description, price, category, thumbnail URL, status, type).
- When type is `BUNDLE`, renders a `BundleCoursePicker` for selecting included courses.
- Calls `onChange` on any field change.

---

### 12. ModuleManager

Module CRUD interface for managing course modules.

```tsx
import ModuleManager from '../components/ModuleManager';

interface ModuleManagerProps {
  courseId: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
```

**Behavior:**
- Lists all modules for the given course with drag-to-reorder support.
- Add, edit, and delete modules.
- Integrates `VideoUploader` for attaching video content to modules.
- Calls `showToast` for success/error feedback on CRUD operations.
