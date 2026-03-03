# Components Reference

This document covers all shared components (15) and admin components (12) in the Eyebuckz LMS frontend.

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
  videoId?: string;
  moduleId?: string;
  fallbackUrl?: string;
  className?: string;
  controls?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onClick?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onLoadedMetadata?: (duration: number) => void;
  onQualityChange?: (quality: string) => void;
}

// Ref handle (use with React.useRef<VideoPlayerHandle>)
interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  load: () => void;
  refreshUrl: () => Promise<void>;
  requestPiP: () => Promise<void>;
  currentTime: number;
  duration: number;
  paused: boolean;
  // additional video element properties
}
```

**Behavior:**
- Uses `useVideoUrl` hook to fetch signed HLS URLs.
- Initializes hls.js for HLS playback in non-Safari browsers.
- Exposes imperative methods via `React.forwardRef` + `useImperativeHandle`.
- Auto-refreshes signed URLs before expiry.

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

### 7. NotificationBell

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

### 8. Toast

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

### 9. SearchBar

Debounced search input field.

```tsx
import { SearchBar } from '../components';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number; // default: 400
}
```

**Behavior:**
- Text input with search icon.
- Debounces `onChange` calls by `debounceMs` to avoid excessive re-renders and API calls.

---

### 10. CourseFilters

Filter sidebar for course listings.

```tsx
import { CourseFilters } from '../components';
import type { CourseFiltersState } from '../components/CourseFilters';

interface CourseFiltersState {
  category?: string;
  priceRange?: [number, number];
  rating?: number;
  sortBy?: string;
  // additional filter fields
}

interface CourseFiltersProps {
  filters: CourseFiltersState;
  onChange: (filters: CourseFiltersState) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}
```

**Behavior:**
- Renders filter controls (category select, price range, rating threshold, sort order).
- Calls `onChange` when any filter value changes.
- `onClose` and `showCloseButton` support mobile overlay dismissal.

---

### 11. CourseCardSkeleton

Loading skeleton placeholders for course cards and dashboard.

```tsx
import { CourseCardSkeleton, DashboardSkeleton } from '../components';

// CourseCardSkeleton -- no props
// DashboardSkeleton -- no props (renders a 3-column grid of skeletons)
```

**Behavior:**
- `CourseCardSkeleton` renders a single card-shaped animated skeleton.
- `DashboardSkeleton` renders a 3-column grid of skeleton cards for the dashboard loading state.

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

Color-coded badge for displaying entity status.

```tsx
import StatusBadge from '../components/StatusBadge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}
```

**Supported Status Values and Colors:**
| Status | Color |
|--------|-------|
| `PUBLISHED` | Green |
| `DRAFT` | Yellow |
| `ACTIVE` | Green |
| `REVOKED` | Red |
| `EXPIRED` | Gray |
| `PENDING` | Yellow |
| `captured` | Green |
| `refunded` | Blue |
| `failed` | Red |
| `USER` | Blue |
| `ADMIN` | Purple |
| `MODULE` | Blue |
| `BUNDLE` | Indigo |

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
  confirmColor?: string;   // Tailwind color class
  loading?: boolean;
}
```

**Behavior:**
- Displays a modal with `title`, `message`, and optional `warning` text.
- Two buttons: Cancel (calls `onClose`) and Confirm (calls `onConfirm`).
- Confirm button shows a spinner when `loading` is true.
- `confirmColor` controls the confirm button styling (e.g., `'red'` for delete actions).

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
