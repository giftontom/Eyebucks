# Admin Panel Guide

> Last updated: March 3, 2026

## 1. Overview

The Eyebuckz LMS admin panel is a React-based management interface that provides platform administrators with full control over courses, users, payments, certificates, site content, and reviews. It lives under the `/#/admin/*` routes (HashRouter) and is only accessible to users whose `role` column in the `users` table is set to `ADMIN`.

The admin panel handles:

- **Analytics dashboard** with real-time stats, sales charts, and activity feeds
- **Course CRUD** including module management, video uploads, and bundle configuration
- **User management** with role assignment, status toggling, and manual enrollment
- **Certificate issuance** and revocation
- **Payment viewing** and Razorpay refund processing
- **CMS content editing** for FAQs, testimonials, and showcases
- **Review moderation** with search and deletion

All data queries flow through `services/api/admin.api.ts`, which uses `@supabase/supabase-js` for direct PostgREST queries and Supabase Edge Functions for operations requiring server-side secrets (certificate generation, refund processing).

---

## 2. Access & Role Assignment

### How the Admin Role Is Set

The admin role is stored in the `users.role` column in Supabase PostgreSQL. Valid values are `USER` (default) and `ADMIN`. To grant admin access, update the user's role directly in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Alternatively, an existing admin can change a user's role from the Users page via the role dropdown, which calls `adminApi.updateUser(userId, { role: 'ADMIN' })`.

### AdminLayout Role Check

The `AdminLayout` component (`pages/admin/AdminLayout.tsx`) is the gateway to all admin routes. It performs a client-side role check before rendering any admin content:

```tsx
const { user, isLoading } = useAuth();

if (user?.role !== 'ADMIN') {
  return <AccessDenied />;  // Shows "Access Denied" with a link to return home
}
```

- While auth state is loading, a spinner is displayed.
- If the user is not an admin, a full-screen "Access Denied" message appears with a link back to the homepage.
- If the user is an admin, the `AdminProvider` context wraps all child routes, and the layout renders the sidebar + main content area.

### RLS Enforcement

Client-side role checks are supplemented by Row-Level Security (RLS) policies at the database level. The `is_admin()` SQL function verifies admin status server-side, ensuring that even if a non-admin somehow reaches admin API calls, the database will reject unauthorized queries. Key RLS behaviors:

- Admin users have full read/write access to all tables via RLS policies that check `is_admin()`.
- Regular users can only access their own data (enrollments, progress, certificates, notifications).
- Edge Functions use the `service_role` key for privileged operations that bypass RLS when needed (e.g., certificate generation).

---

## 3. Admin Routes

All admin routes are defined in `pages/admin/AdminRoutes.tsx`. Every route is nested inside `AdminLayout`, which enforces the role check and provides the `AdminProvider` context.

| Path | Component | Description |
|------|-----------|-------------|
| `/admin` | `DashboardPage` | Analytics dashboard with stats cards, sales chart, quick actions, and activity feed |
| `/admin/courses` | `CoursesPage` | Course list with publish/unpublish, archive/restore, analytics modal, and sorting |
| `/admin/courses/new` | `CourseEditorPage` | Create a new course (MODULE or BUNDLE type) |
| `/admin/courses/:courseId` | `CourseEditorPage` | Edit an existing course, manage its modules or bundle composition |
| `/admin/users` | `UsersPage` | User list with search, role filter, role change, status toggle, and manual enrollment |
| `/admin/users/:userId` | `UserDetailPage` | Detailed user profile with enrollment list and enrollment revocation |
| `/admin/certificates` | `CertificatesPage` | Certificate list with manual issuance and revocation |
| `/admin/content` | `ContentPage` | CMS editor for site content (FAQs, testimonials, showcases) |
| `/admin/payments` | `PaymentsPage` | Payment list with search, revenue summary, and refund processing |
| `/admin/reviews` | `ReviewsPage` | Review list with search and deletion for content moderation |

---

## 4. Admin Context

### File

`pages/admin/AdminContext.tsx`

### What It Manages

The `AdminProvider` wraps all admin pages and provides shared state via React Context:

| State / Method | Type | Purpose |
|----------------|------|---------|
| `courses` | `AdminCourse[]` | Cached list of all courses (loaded on mount) |
| `users` | `AdminUser[]` | Cached list of users (loaded on demand) |
| `coursesLoaded` | `boolean` | Whether courses have been fetched at least once |
| `usersLoaded` | `boolean` | Whether users have been fetched at least once |
| `refreshCourses()` | `() => Promise<void>` | Re-fetches the full course list from `adminApi.getCourses()` |
| `refreshUsers(params?)` | `(params?) => Promise<void>` | Re-fetches users with optional search/role filters |
| `showToast(message, type?)` | Toast function | Displays success, error, or info toast notifications |

### How Data Is Loaded

- **Courses** are loaded automatically on mount via `useEffect` calling `refreshCourses()`. This is because multiple pages need course data (CourseEditor, CertificatesPage for the issue modal, UsersPage for the enroll modal).
- **Users** are loaded on demand -- only when a page explicitly calls `refreshUsers()`. The CertificatesPage, for example, calls `refreshUsers()` when the "Issue Manually" modal is opened and `usersLoaded` is false.

### Usage

Any admin page or component accesses the context via the `useAdmin()` hook:

```tsx
const { showToast, courses, refreshCourses } = useAdmin();
```

---

## 5. Admin Pages

### Dashboard (`DashboardPage.tsx`)

The landing page for the admin panel. It fetches three data sources in parallel on mount:

- **Stats cards** (via `adminApi.getStats()` RPC): Total Sales revenue, Active Learners count, Total Courses count, and Certificates Issued count. Displayed as four cards across the top.
- **Sales chart** (via `adminApi.getSales(days)` RPC): An area chart (Recharts `AreaChart`) showing revenue over time. Supports 7-day, 30-day, and 90-day period toggles.
- **Recent activity** (via `adminApi.getRecentActivity(limit)` RPC): Shows recent enrollments and recently issued certificates in a feed format.
- **Quick Actions**: Four shortcut buttons linking to New Course, Manage Users, Certificates, and Content pages.

### Courses (`CoursesPage.tsx`)

Lists all courses in a sortable `DataTable` with columns for title, status, price, enrollment count, and actions.

Key features:
- **Sorting** by title, price, enrollment count, or status (client-side).
- **Archive/Restore toggle**: A filter button switches between showing active courses and archived courses. Archiving is a soft-delete (sets `deleted_at` timestamp); restoring clears it.
- **Publish/Unpublish**: Toggle a course between PUBLISHED and DRAFT status. Publishing sets the `published_at` timestamp.
- **Course Analytics modal**: Opens a modal displaying enrollment count, completion rate, average watch time, total revenue, and active students (last 30 days) via `adminApi.getCourseAnalytics()`.
- **Navigation to editor**: "Edit" button navigates to `/admin/courses/:courseId`. "New Course" button navigates to `/admin/courses/new`.

### Course Editor (`CourseEditorPage.tsx`)

A single page that handles both course creation and editing, determined by the presence of `:courseId` in the URL.

**Course form** (`CourseForm` component) with fields:
- Title, Slug, Description, Price (in rupees, stored as paise internally), Thumbnail URL, Type (MODULE or BUNDLE), and a dynamic Features list.
- Price is entered in rupees and converted to paise (`* 100`) before saving.

**Module management** (for MODULE type courses): When editing an existing MODULE course, the `ModuleManager` component appears below the form. It supports:
- Listing all modules ordered by `order_index`.
- Creating and editing modules via a modal with fields for title, duration (MM:SS format), video source (URL or upload via `VideoUploader`), and free preview toggle.
- Reordering modules with up/down buttons.
- Deleting modules with confirmation.

**Bundle management** (for BUNDLE type courses): When editing a BUNDLE course, the `BundleCoursePicker` component appears, allowing selection of which MODULE courses are included in the bundle.

### Users (`UsersPage.tsx`)

Displays a paginated, searchable user table with columns for identity (avatar + name + email), phone, role, status, enrollment count, and actions.

Key features:
- **Search** with debounce (400ms default) filtering by name or email.
- **Role filter** dropdown (All Roles, USER, ADMIN).
- **Inline role change**: A dropdown on each row to switch between USER and ADMIN roles.
- **Status toggle**: Click the Active/Inactive badge to toggle `is_active`.
- **Manual enrollment modal**: Select a course to enroll the user in for free (amount = 0, payment_id = 'manual_enrollment').
- **Navigation to detail**: "Details" link navigates to `/admin/users/:userId`.

### User Detail (`UserDetailPage.tsx`)

A detailed view of a single user, showing:
- Profile card with avatar, name, email, role badge, active status badge, phone number, join date, and last login date.
- **Enrollments table**: Lists all enrollments with course title, type, status, amount paid, and enrollment date.
- **Enrollment revocation**: Active enrollments can be revoked via a `ConfirmDialog`, which sets the enrollment status to REVOKED.

### Certificates (`CertificatesPage.tsx`)

A paginated table of all issued certificates with columns for certificate number, student name, course title, issue date, status, and action.

Key features:
- **Manual issuance**: Opens a modal to select a user and course, then calls the `certificate-generate` Edge Function. Includes a warning that this bypasses course completion verification.
- **Revocation**: Opens a modal to enter a revocation reason. Sets status to REVOKED with a timestamp and reason.

### Payments (`PaymentsPage.tsx`)

Shows a paginated, searchable list of all payments with a revenue summary header.

Key features:
- **Revenue summary cards**: Total Transactions count, Total Revenue (from admin stats RPC), and Refunded amount (calculated from current page).
- **Search** by receipt number or Razorpay payment ID with debounce.
- **DataTable columns**: Receipt number, student name/email, course title, amount (in rupees, stored as paise), status badge, date, and action.
- **Refund processing**: For payments with `captured` status, a "Refund" button opens a modal requiring a reason. Calls the `refund-process` Edge Function which handles the Razorpay refund API server-side.

### Content (`ContentPage.tsx`)

A CMS editor for managing site content items grouped by section (FAQ, Testimonial, Showcase).

Key features:
- Content items are displayed grouped by section with order index and active/inactive status.
- **Create/Edit modal** with fields: Section (dropdown), Title, Body, Metadata (JSON editor), Order Index, and Active toggle.
- **Delete** with confirmation prompt.
- Metadata field accepts arbitrary JSON for section-specific data (e.g., testimonial author role, image URL).

### Reviews (`ReviewsPage.tsx`)

A paginated, searchable table for moderating course reviews.

Key features:
- **Search** by comment text with debounce.
- **DataTable columns**: User (name + email), course title, star rating (visual 5-star display), comment (truncated), date, and delete button.
- **Delete** with a `ConfirmDialog` confirmation. Deletion is permanent.

---

## 6. Key Workflows

### Creating a Course

1. Navigate to **Courses** > click **"New Course"** (or go to `/#/admin/courses/new`).
2. Fill in the **CourseForm**: title, slug, description, price (in rupees), thumbnail URL, type (MODULE or BUNDLE), and features.
3. If type is **BUNDLE**, use the `BundleCoursePicker` to select which module courses are included.
4. Click **"Create Course"**. The course is created with `status: 'DRAFT'`.
5. For **MODULE** type courses, you are redirected to the edit page where the **ModuleManager** appears. Add modules (see below).
6. Return to the **Courses** list and click **"Publish"** to set the course status to PUBLISHED and make it visible to students.

### Uploading a Video (Module)

1. Navigate to the **Course Editor** for an existing MODULE course.
2. In the **ModuleManager** section, click **"Add Module"**.
3. In the module modal, enter the module title and duration (MM:SS).
4. For the video source, choose either:
   - **"Enter URL"**: Paste a Bunny.net video GUID or any video URL directly.
   - **"Upload Video"**: Use the `VideoUploader` component, which calls the `admin-video-upload` Edge Function to upload the video to Bunny.net Stream. On success, the video URL and duration are auto-populated.
5. Optionally check **"Free Preview"** to allow non-enrolled users to watch.
6. Click **"Create Module"**. The module is saved with an auto-incremented `order_index`.
7. Use the up/down arrows on the module list to reorder as needed.

### Issuing a Certificate

1. Navigate to **Certificates** > click **"Issue Manually"**.
2. In the modal, select a **User** from the dropdown (users are lazy-loaded on first open).
3. Select a **Course** from the dropdown.
4. Click **"Issue Certificate"**. This calls the `certificate-generate` Edge Function, which:
   - Generates a unique certificate number.
   - Creates the certificate record in the database.
   - Optionally sends a notification email via Resend.
5. The new certificate appears in the table with ACTIVE status.
6. To **revoke**, click "Revoke" on any active certificate, enter a reason, and confirm. The certificate status changes to REVOKED with a timestamp.

### Processing a Refund

1. Navigate to **Payments**.
2. Search for the payment by receipt number or Razorpay payment ID.
3. Click **"Refund"** on a payment with `captured` status.
4. In the modal, enter the **reason for refund** (required).
5. Click **"Confirm Refund"**. This calls the `refund-process` Edge Function, which:
   - Validates the payment exists and is eligible for refund.
   - Calls the Razorpay Refund API with the payment ID.
   - Updates the payment record with refund details (refund ID, amount, reason, timestamp).
   - Revokes the associated enrollment.
6. The payment status changes to `refunded` in the table.

---

## 7. Admin Components

All admin-specific components are in `pages/admin/components/`.

| Component | File | Purpose |
|-----------|------|---------|
| `AdminSidebar` | `AdminSidebar.tsx` | Navigation sidebar with 7 nav links. Responsive: collapsible hamburger drawer on mobile, fixed sidebar on desktop (width 240px). Uses `NavLink` for active state highlighting. |
| `DataTable` | `DataTable.tsx` | Generic typed table component. Accepts column definitions with custom render functions, supports loading/empty states, optional sorting (column headers), and optional pagination controls with page navigation. |
| `StatusBadge` | `StatusBadge.tsx` | Color-coded badge for status values. Maps statuses like PUBLISHED (green), DRAFT (yellow), ACTIVE (green), REVOKED (red), captured (green), refunded (yellow), USER (blue), ADMIN (purple), MODULE (slate), BUNDLE (purple), etc. |
| `AdminModal` | `AdminModal.tsx` | Reusable modal overlay with backdrop blur, click-outside-to-close, configurable max width and z-index. Used by certificate issue, refund, enrollment, module edit, and content edit modals. |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Extends `AdminModal` for destructive action confirmation. Shows message, optional warning text, Cancel/Confirm buttons with customizable label, color, and loading state. Used for archive, revoke, and delete actions. |
| `StatsCard` | `StatsCard.tsx` | Dashboard stat card with label, value, subtitle, and icon. Used for the four KPI cards on the dashboard. |
| `SalesChart` | `SalesChart.tsx` | Recharts `AreaChart` showing revenue over time with 7d/30d/90d period toggles. Gradient fill under the line, formatted Y-axis in thousands (k). |
| `ActivityFeed` | `ActivityFeed.tsx` | Dashboard feed showing recent enrollments and recently issued certificates with avatar, name, course title, and date. |
| `QuickActions` | `QuickActions.tsx` | Dashboard grid of four shortcut buttons (New Course, Manage Users, Certificates, Content) that navigate to the respective admin pages. |
| `CourseForm` | `CourseForm.tsx` | Form component for course creation/editing. Fields: title, slug, description, price, thumbnail, type, features list. Integrates `BundleCoursePicker` when type is BUNDLE. |
| `ModuleManager` | `ModuleManager.tsx` | Full module CRUD for a course. Lists modules with reorder buttons, and provides a create/edit modal with video URL entry or `VideoUploader` integration. |
| `BundleCoursePicker` | `BundleCoursePicker.tsx` | Checkbox list of available MODULE courses for selecting which courses are included in a BUNDLE. Filters out archived courses. |

---

## 8. Admin Hooks

All admin-specific hooks are in `pages/admin/hooks/`.

### `useAdminData<T>`

**File:** `hooks/useAdminData.ts`

A generic data-fetching hook for admin pages. Manages loading, error, and data state with a refetch capability.

```tsx
const { data, loading, error, refetch } = useAdminData<AdminCourse[]>({
  fetchFn: () => adminApi.getCourses().then(r => r.courses),
  deps: [],           // Optional dependency array for re-fetching
  autoFetch: true,    // Whether to fetch on mount (default: true)
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetchFn` | `() => Promise<T>` | required | Async function that returns the data |
| `deps` | `any[]` | `[]` | Dependency array -- refetches when deps change |
| `autoFetch` | `boolean` | `true` | Whether to fetch automatically on mount |

Returns `{ data: T | null, loading: boolean, error: string | null, refetch: () => Promise<void> }`.

### `useDebounce<T>`

**File:** `hooks/useDebounce.ts`

Debounces a value by a configurable delay. Used for search inputs to avoid firing API calls on every keystroke.

```tsx
const debouncedSearch = useDebounce(search, 400);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `T` | required | The value to debounce |
| `delay` | `number` | `400` | Delay in milliseconds |

Returns the debounced value of type `T`.

### `usePagination`

**File:** `hooks/usePagination.ts`

Manages pagination state for paginated admin tables.

```tsx
const { pagination, setPage, setTotal, nextPage, prevPage, reset } = usePagination(20);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `initialLimit` | `number` | `20` | Number of items per page |

**Pagination state** (`PaginationState`):

| Field | Type | Description |
|-------|------|-------------|
| `page` | `number` | Current page (1-indexed) |
| `limit` | `number` | Items per page |
| `total` | `number` | Total item count (set after API response) |
| `totalPages` | `number` | Computed from total / limit |

**Methods:**

| Method | Description |
|--------|-------------|
| `setPage(n)` | Jump to page `n` |
| `setTotal(n)` | Update total count (recalculates `totalPages`) |
| `nextPage()` | Go to next page (clamped to `totalPages`) |
| `prevPage()` | Go to previous page (clamped to 1) |
| `reset()` | Reset to page 1 |
