# API Service Modules

All API modules live in `services/api/` and communicate with Supabase via PostgREST queries (`@supabase/supabase-js`) or Edge Function invocations. Every module is exported through the `services/api/index.ts` barrel file.

```ts
import { coursesApi, enrollmentsApi, progressApi, checkoutApi, adminApi,
         notificationsApi, paymentsApi, certificatesApi, reviewsApi,
         siteContentApi, usersApi } from 'services/api';
```

---

## Table of Contents

1. [courses.api.ts](#1-coursesapits)
2. [enrollments.api.ts](#2-enrollmentsapits)
3. [progress.api.ts](#3-progressapits)
4. [checkout.api.ts](#4-checkoutapits)
5. [admin.api.ts](#5-adminapits)
6. [notifications.api.ts](#6-notificationsapits)
7. [payments.api.ts](#7-paymentsapits)
8. [certificates.api.ts](#8-certificatesapits)
9. [reviews.api.ts](#9-reviewsapits)
10. [siteContent.api.ts](#10-sitecontentapits)
11. [users.api.ts](#11-usersapits)
12. [Error Handling Patterns](#error-handling-patterns)

---

## 1. courses.api.ts

**Export:** `coursesApi`
**Tables:** `courses`, `modules`, `bundle_courses`, `reviews`, `users`
**Auth required:** No (public reads). Access check uses auth internally for video URL redaction.

> **New in standardization:** `getCoursesByIds()` method added for batch lookups (used by Dashboard).

### Internal Helpers

| Helper | Purpose |
|--------|---------|
| `mapCourse(row)` | Maps DB row to frontend `Course` type. Converts snake_case to camelCase, parses dates, maps nested `modules` and `reviews` arrays. |
| `mapModule(row)` | Maps DB row to frontend `Module` type with camelCase fields. |

### Functions

#### `getCourses()`

```ts
async getCourses(): Promise<{ success: boolean; courses: Course[] }>
```

Returns all courses where `status = 'PUBLISHED'`, ordered by `created_at` descending. Each course includes its nested modules (id, title, duration, duration_seconds, video_url, is_free_preview, order_index).

For courses with `type = 'BUNDLE'`, a second query fetches associated courses from `bundle_courses` (joined with `courses` and their `modules`) and attaches them as `course.bundledCourses[]` with fields: id, title, slug, thumbnail, moduleCount.

#### `getCourse(idOrSlug: string)`

```ts
async getCourse(idOrSlug: string): Promise<{ success: boolean; course: Course }>
```

Fetches a single course by ID or slug. Auto-detects the lookup strategy:
- **UUID format** (or starts with `'c'`): queries by `id`
- **Otherwise**: queries by `slug`

Includes nested `modules` (sorted by `order_index` ascending) and `reviews` (with user names via `users(name)` join).

For `BUNDLE` type courses, fetches bundled course details from `bundle_courses` with full course metadata (id, title, slug, description, thumbnail, price, rating, total_students, moduleCount).

#### `getCourseModules(courseId: string)`

```ts
async getCourseModules(courseId: string): Promise<{
  success: boolean;
  modules: Module[];
  hasAccess: boolean;
}>
```

Returns all modules for a course, ordered by `order_index` ascending.

**Access check logic:**
1. Gets the current auth user via `supabase.auth.getUser()`
2. Checks for an ACTIVE enrollment in `enrollments`
3. Checks the user's `role` in the `users` table for ADMIN status
4. `hasAccess = true` if enrolled OR admin

**Video URL redaction:** When `hasAccess` is `false`, `videoUrl` is set to `''` for all modules where `isFreePreview` is `false`. Free preview modules always retain their video URL.

#### `getCoursesByIds(ids: string[])`

```ts
async getCoursesByIds(ids: string[]): Promise<{ id: string; title: string; thumbnail: string; type: string; description: string }[]>
```

Batch lookup of courses by an array of IDs. Returns an array of lightweight course objects (id, title, thumbnail, type, description). Returns `[]` if the input array is empty. Used by the Dashboard page to resolve course details for user enrollments.

---

## 2. enrollments.api.ts

**Export:** `enrollmentsApi`
**Tables:** `enrollments`, `courses`, `users`
**Auth required:** Yes (all functions check current user)

### Internal Helpers

| Helper | Purpose |
|--------|---------|
| `mapEnrollment(row)` | Maps DB row to `Enrollment` type. Also constructs a nested `progress` object from the enrollment's `completed_modules`, `current_module`, `overall_percent`, and `total_watch_time` fields. |

### Functions

#### `getUserEnrollments()`

```ts
async getUserEnrollments(): Promise<EnrollmentWithCourse[]>
```

Returns all ACTIVE enrollments for the current user, ordered by `enrolled_at` descending. Each enrollment includes the full joined `courses(*)` data mapped to a `course` property with camelCase fields (id, slug, title, description, price, thumbnail, heroVideoId, type, status, rating, totalStudents, features, createdAt, updatedAt, publishedAt).

Returns `[]` if no user is authenticated (does not throw).

#### `checkAccess(courseId: string)`

```ts
async checkAccess(courseId: string): Promise<boolean>
```

Returns `true` if the current user has access to the course. Access is granted when:
- User role is `ADMIN` (checked via `users` table), **OR**
- User has an ACTIVE enrollment for the course

Returns `false` if not authenticated.

#### `getEnrollment(courseId: string)`

```ts
async getEnrollment(courseId: string): Promise<Enrollment | null>
```

Returns the specific ACTIVE enrollment for the current user and course, or `null` if not enrolled or not authenticated. Uses `maybeSingle()` to avoid throwing on no match.

#### `updateLastAccess(enrollmentId: string)`

```ts
async updateLastAccess(enrollmentId: string): Promise<void>
```

Updates `last_accessed_at` to the current ISO timestamp for the given enrollment.

#### `updateProgress(enrollmentId: string, data)`

```ts
async updateProgress(enrollmentId: string, data: {
  completedModules?: string[];
  currentModule?: string | null;
  overallPercent?: number;
  totalWatchTime?: number;
}): Promise<void>
```

Selectively updates enrollment progress fields. Only fields present in the `data` parameter are included in the update. Maps camelCase input to snake_case DB columns:

| Input | DB Column |
|-------|-----------|
| `completedModules` | `completed_modules` |
| `currentModule` | `current_module` |
| `overallPercent` | `overall_percent` |
| `totalWatchTime` | `total_watch_time` |

---

## 3. progress.api.ts

**Export:** `progressApi`, `AUTO_SAVE_INTERVAL`, `COMPLETION_THRESHOLD`
**Tables:** `progress`, `enrollments`, `modules`
**RPCs:** `get_progress_stats`, `increment_view_count`
**Edge Functions:** `progress-complete`
**Auth required:** Yes

### Exported Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `COMPLETION_THRESHOLD` | `0.95` | Watch percentage (95%) at which a module auto-completes |
| `AUTO_SAVE_INTERVAL` | `30000` | Milliseconds (30s) between auto-save checkpoints |

### Internal Types

```ts
interface ModuleProgress {
  moduleId: string;
  lastTimestamp: number;
  completed: boolean;
  completedAt: Date | string | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: string;
}
```

### Functions

#### `saveProgress(courseId, moduleId, timestamp)`

```ts
async saveProgress(courseId: string, moduleId: string, timestamp: number): Promise<void>
```

Saves a watch checkpoint. Checks if a progress record already exists:
- **Existing record:** Calls the `increment_view_count` RPC for atomic view count increment and timestamp update. Falls back to a plain `.update()` if the RPC does not exist.
- **New record:** Inserts with `view_count = 1`.

Returns silently if not authenticated.

#### `markComplete(courseId, moduleId, currentTime?, duration?)`

```ts
async markComplete(courseId: string, moduleId: string, currentTime?: number, duration?: number): Promise<{
  success: boolean;
  progress?: Progress;
  stats?: ProgressStats;
}>
```

Delegates to the `progress-complete` Edge Function for atomic server-side completion. The Edge Function handles marking the progress record as complete, updating enrollment stats, checking course completion, and potentially issuing a certificate.

#### `checkCompletion(courseId, moduleId, currentTime, duration)`

```ts
async checkCompletion(courseId: string, moduleId: string, currentTime: number, duration: number): Promise<boolean>
```

Client-side auto-completion check. Returns `true` and triggers `markComplete()` if:
1. `duration > 0`
2. `currentTime / duration >= COMPLETION_THRESHOLD` (95%)
3. The module is not already marked as completed

Returns `false` if duration is 0 or the threshold has not been reached.

#### `getModuleProgress(courseId, moduleId)`

```ts
async getModuleProgress(courseId: string, moduleId: string): Promise<ModuleProgress | null>
```

Returns progress data for a specific module, or `null` if not authenticated or no record exists. Uses `maybeSingle()`.

#### `getResumePosition(courseId, moduleId)`

```ts
async getResumePosition(courseId: string, moduleId: string): Promise<number>
```

Convenience wrapper around `getModuleProgress()` that returns the `lastTimestamp` value (seconds), or `0` if no progress exists. Used by the video player to resume playback.

#### `getProgress(courseId)`

```ts
async getProgress(courseId: string): Promise<ModuleProgress[]>
```

Returns all progress records for the current user in a course. Returns `[]` on error or if not authenticated (does not throw).

#### `getCourseStats(courseId)`

```ts
async getCourseStats(courseId: string): Promise<ProgressStats>
```

Calls the `get_progress_stats` RPC with `p_user_id` and `p_course_id`. Returns a `ProgressStats` object with `completedModules`, `totalModules`, `overallPercent`, `totalWatchTime`, and `currentModule`.

Returns zeroed defaults if not authenticated or on error.

#### `updateCurrentModule(courseId, moduleId)`

```ts
async updateCurrentModule(courseId: string, moduleId: string): Promise<void>
```

Updates the `current_module` field on the user's ACTIVE enrollment for the course.

#### `clearProgress(courseId)`

```ts
async clearProgress(courseId: string): Promise<void>
```

Deletes all progress records for the current user in the given course. Intended for testing/development.

---

## 4. checkout.api.ts

**Export:** `checkoutApi`
**Tables:** `enrollments`, `courses`
**Edge Functions:** `checkout-create-order`, `checkout-verify`
**Auth required:** Yes (Edge Functions require JWT)

### Functions

#### `createOrder(courseId)`

```ts
async createOrder(courseId: string): Promise<{
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  courseTitle: string;
  mock?: boolean;
  message?: string;
  warning?: string;
}>
```

Invokes the `checkout-create-order` Edge Function. The Edge Function creates a Razorpay order using server-side secrets and returns the order ID, amount (in paise), currency, Razorpay public key, and course title needed to open the Razorpay checkout modal on the frontend.

- `mock: true` indicates a test/mock payment (dev mode)
- `warning` may contain messages about pricing or configuration issues

Uses `extractEdgeFnError()` to surface the real error message from the Edge Function response.

#### `verifyPayment(params)`

```ts
async verifyPayment(params: {
  orderId: string;
  paymentId: string;
  signature?: string;
  courseId: string;
}): Promise<{
  success: boolean;
  verified: boolean;
  enrollmentId: string;
  mock?: boolean;
  message?: string;
  bundleWarning?: string;
  failedCourseIds?: string[];
}>
```

Invokes the `checkout-verify` Edge Function. The Edge Function performs HMAC signature verification using the Razorpay secret, records the payment, and creates enrollment(s).

- `signature` is optional (omitted in mock mode)
- `bundleWarning` and `failedCourseIds` appear when a bundle purchase partially fails (some courses could not be enrolled)

Uses `extractEdgeFnError()` for error extraction.

#### `checkOrderStatus(orderId)`

```ts
async checkOrderStatus(orderId: string): Promise<{
  success: boolean;
  status: 'pending' | 'completed';
  enrollment?: {
    id: string;
    courseId: string;
    courseTitle: string;
    enrolledAt: Date;
  };
}>
```

Queries the `enrollments` table directly (not an Edge Function) to check if an enrollment has been created for the given Razorpay order ID. Used for webhook-based enrollment flow where the frontend polls after payment.

Returns `status: 'completed'` with enrollment details if found, `status: 'pending'` otherwise.

---

## 5. admin.api.ts

**Export:** `adminApi`, `AdminReview` (interface)
**Tables:** All tables (courses, modules, enrollments, users, payments, certificates, site_content, reviews, bundle_courses, notifications)
**RPCs:** `get_admin_stats`, `get_sales_data`, `get_recent_activity`, `get_course_analytics`
**Edge Functions:** `certificate-generate`, `refund-process`
**Auth required:** Yes (admin role enforced by RLS policies)

This is the largest module, organized into sections: Dashboard Analytics, User Management, Course Management, Module Management, Bundle Course Management, Certificate Management, Enrollment Management, Site Content Management, Payment Management, Course Analytics, and Reviews Moderation.

### Dashboard Analytics

#### `getStats()`

```ts
async getStats(): Promise<{ success: boolean; stats: AdminStats }>
```

Calls the `get_admin_stats` RPC. Returns aggregate statistics (total users, courses, enrollments, revenue, etc.).

#### `getSales(days?)`

```ts
async getSales(days: number = 30): Promise<{ success: boolean; sales: SalesDataPoint[] }>
```

Calls the `get_sales_data` RPC with `p_days` parameter. Returns an array of `{ date: string, amount: number }` objects for charting. Default: last 30 days.

#### `getRecentActivity(limit?)`

```ts
async getRecentActivity(limit: number = 10): Promise<{ success: boolean; activity: any }>
```

Calls the `get_recent_activity` RPC with `p_limit`. Returns recent platform activity items. Default: 10 items.

### User Management

#### `getUsers(params?)`

```ts
async getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<{
  success: boolean;
  users: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>
```

Paginated user list with optional search (by name or email via `ilike`) and role filter. Joins `enrollments(id)` to include `enrollmentCount` and backward-compatible `_count.enrollments`. Limit is capped at 100. Default page size: 20.

#### `getUserDetails(userId)`

```ts
async getUserDetails(userId: string): Promise<{ success: boolean; user: any }>
```

Full user profile with nested `enrollments(*, courses(*))` join.

#### `updateUser(userId, updates)`

```ts
async updateUser(userId: string, updates: {
  isActive?: boolean;
  role?: string;
}): Promise<{ success: boolean; message: string; user: any }>
```

Updates user fields. Maps `isActive` to `is_active` and `role` directly.

#### `manualEnrollUser(userId, courseId)`

```ts
async manualEnrollUser(userId: string, courseId: string): Promise<{
  success: boolean;
  message: string;
  enrollment: any;
}>
```

Creates an enrollment with `status: 'ACTIVE'`, `amount: 0`, and `payment_id`/`order_id` set to `'manual_enrollment'`. Detects duplicate enrollment via PostgreSQL unique constraint violation (`error.code === '23505'`) and throws `'User is already enrolled'`.

### Course Management

#### `getCourses()`

```ts
async getCourses(): Promise<{ success: boolean; courses: any[] }>
```

Returns ALL courses (including DRAFT and deleted), ordered by `created_at` descending. Joins `modules(id)` and `enrollments(id)` for counts. Each course includes:
- `heroVideoId` (mapped from `hero_video_id`)
- `totalStudents` (mapped from `total_students`)
- `enrollmentCount` and `_count.modules`/`_count.enrollments`

#### `createCourse(data)`

```ts
async createCourse(data: {
  title: string;
  slug: string;
  description: string;
  price: number;
  thumbnail?: string;
  type: string;
  features?: string[];
  heroVideoId?: string;
}): Promise<{ success: boolean; message: string; course: any }>
```

Creates a new course with `status: 'DRAFT'`. Maps `heroVideoId` to `hero_video_id`.

#### `updateCourse(courseId, data)`

```ts
async updateCourse(courseId: string, courseData: any): Promise<{
  success: boolean;
  message: string;
  course: any;
}>
```

Selectively updates course fields. Supports: title, slug, description, price, thumbnail, type, features, heroVideoId (mapped to `hero_video_id`), status.

#### `deleteCourse(courseId)` -- Soft Delete

```ts
async deleteCourse(courseId: string): Promise<{ success: boolean; message: string }>
```

Soft-deletes by setting `deleted_at` to the current timestamp. Does not remove the record.

#### `restoreCourse(courseId)`

```ts
async restoreCourse(courseId: string): Promise<{ success: boolean; message: string }>
```

Restores a soft-deleted course by setting `deleted_at` to `null`.

#### `publishCourse(courseId, status)`

```ts
async publishCourse(courseId: string, status: 'PUBLISHED' | 'DRAFT'): Promise<{
  success: boolean;
  message: string;
  course: any;
}>
```

Sets the course status. When publishing (`status = 'PUBLISHED'`), also sets `published_at` to the current timestamp.

### Module Management

#### `getModules(courseId)`

```ts
async getModules(courseId: string): Promise<{ success: boolean; modules: Module[] }>
```

Returns all modules for a course, ordered by `order_index` ascending. Maps all fields to camelCase `Module` type.

#### `createModule(courseId, data)`

```ts
async createModule(courseId: string, data: {
  title: string;
  duration: string;
  videoUrl: string;
  isFreePreview?: boolean;
}): Promise<{ success: boolean; message: string; module: any }>
```

Creates a new module. Auto-calculates:
- `order_index`: max existing order_index + 1
- `duration_seconds`: parsed from `duration` string (`"MM:SS"` format)

Maps `videoUrl` to `video_url` and `isFreePreview` to `is_free_preview`.

#### `updateModule(courseId, moduleId, data)`

```ts
async updateModule(courseId: string, moduleId: string, data: {
  title?: string;
  duration?: string;
  videoUrl?: string;
  isFreePreview?: boolean;
  orderIndex?: number;
}): Promise<{ success: boolean; message: string; module: any }>
```

Selectively updates module fields. When `duration` is updated, `duration_seconds` is recalculated automatically. Uses compound filter: `.eq('id', moduleId).eq('course_id', courseId)`.

#### `deleteModule(courseId, moduleId)`

```ts
async deleteModule(courseId: string, moduleId: string): Promise<{ success: boolean; message: string }>
```

Hard-deletes the module. Uses compound filter on both `id` and `course_id`.

#### `reorderModules(courseId, moduleIds[])`

```ts
async reorderModules(courseId: string, moduleIds: string[]): Promise<{
  success: boolean;
  message: string;
}>
```

Sets `order_index` for each module based on its position in the array (1-indexed). Executes all updates in parallel via `Promise.all()`.

### Bundle Course Management

#### `getBundleCourses(bundleId)`

```ts
async getBundleCourses(bundleId: string): Promise<{ success: boolean; courseIds: string[] }>
```

Returns the ordered list of course IDs associated with a bundle.

#### `setBundleCourses(bundleId, courseIds[])`

```ts
async setBundleCourses(bundleId: string, courseIds: string[]): Promise<{
  success: boolean;
  message: string;
}>
```

Replaces all bundle associations. Performs a delete-all then insert-all operation:
1. Deletes all existing `bundle_courses` rows for the bundle
2. Inserts new rows with `order_index` matching array position (0-indexed)

### Certificate Management

#### `getCertificates(params?)`

```ts
async getCertificates(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  certificates: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>
```

Paginated list of all certificates with `users(id, name, email)` and `courses(id, title)` joins. Maps to camelCase fields including `certificateNumber`, `studentName`, `courseTitle`, `issueDate`, `revokedAt`, `revokedReason`. Limit capped at 100, default page size: 20.

#### `issueCertificate(userId, courseId)`

```ts
async issueCertificate(userId: string, courseId: string): Promise<{
  success: boolean;
  message: string;
  certificate: any;
}>
```

Invokes the `certificate-generate` Edge Function. Includes JWT refresh retry logic:
1. On first error, checks `isEdgeFnAuthError(error)`
2. If auth error: calls `supabase.auth.refreshSession()`, then retries the Edge Function call
3. If refresh fails: throws `'Your session has expired. Please log in again.'`

Uses `extractEdgeFnError()` for non-auth errors.

#### `revokeCertificate(certificateId, reason?)`

```ts
async revokeCertificate(certificateId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
  certificate: any;
}>
```

Updates the certificate record directly (not via Edge Function):
- `status` -> `'REVOKED'`
- `revoked_at` -> current timestamp
- `revoked_reason` -> provided reason or `'Revoked by admin'`

### Enrollment Management

#### `revokeEnrollment(enrollmentId)`

```ts
async revokeEnrollment(enrollmentId: string): Promise<{ success: boolean; message: string }>
```

Sets the enrollment `status` to `'REVOKED'`.

### Site Content Management (CMS)

#### `getSiteContent()`

```ts
async getSiteContent(): Promise<{ success: boolean; items: SiteContentItem[] }>
```

Returns all site content items, ordered by `section` then `order_index` ascending. Maps to camelCase `SiteContentItem` type.

#### `createSiteContent(item)`

```ts
async createSiteContent(item: {
  section: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  orderIndex?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; message: string }>
```

Creates a new site content item. Defaults: `metadata = {}`, `orderIndex = 0`, `isActive = true`.

#### `updateSiteContent(id, updates)`

```ts
async updateSiteContent(id: string, updates: {
  title?: string;
  body?: string;
  metadata?: Record<string, any>;
  orderIndex?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; message: string }>
```

Selectively updates site content fields. Maps camelCase to snake_case.

#### `deleteSiteContent(id)`

```ts
async deleteSiteContent(id: string): Promise<{ success: boolean; message: string }>
```

Hard-deletes the site content record.

### Payment Management

#### `getPayments(params?)`

```ts
async getPayments(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ success: boolean; payments: Payment[]; total: number }>
```

Paginated list of all payments with `users(name, email)` and `courses(title)` joins. Search filters by `receipt_number` or `razorpay_payment_id` via `ilike`. Maps to `Payment` type with joined `userName`, `userEmail`, `courseTitle`. Limit capped at 100, default page size: 20.

#### `processRefund(paymentId, reason)`

```ts
async processRefund(paymentId: string, reason: string): Promise<{
  success: boolean;
  message: string;
}>
```

Delegates to `paymentsApi.processRefund()` instead of calling the Edge Function directly. On success, returns a message containing the refund ID.

### Course Analytics

#### `getCourseAnalytics(courseId)`

```ts
async getCourseAnalytics(courseId: string): Promise<{
  success: boolean;
  analytics: CourseAnalytics;
}>
```

Calls the `get_course_analytics` RPC with `p_course_id`. Returns detailed analytics data for a specific course.

### Reviews Moderation

#### `getReviews(params?)`

```ts
async getReviews(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ reviews: AdminReview[]; total: number }>
```

Paginated list of all reviews with `users:user_id(name, email, avatar)` and `courses:course_id(title)` joins. Search filters by `comment` via `ilike`. Returns `AdminReview` objects with `userName`, `userEmail`, `courseTitle`, and `helpful` count. Limit capped at 100, default page size: 20.

**`AdminReview` interface:**

```ts
interface AdminReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
}
```

#### `deleteReview(reviewId)`

```ts
async deleteReview(reviewId: string): Promise<void>
```

Hard-deletes a review. Returns nothing on success; throws on error.

---

## 6. notifications.api.ts

**Export:** `notificationsApi`, `mapNotification`, `Notification` (interface)
**Tables:** `notifications`
**Auth required:** Yes (RLS scopes to current user; `markAllAsRead` explicitly filters by `user_id`)

### Shared Helpers

| Helper | Purpose |
|--------|---------|
| `mapNotification(row: NotificationRow): Notification` | Shared mapper for converting DB rows to `Notification` type. Exported for DRY reuse by `useRealtimeNotifications` hook. |

### Notification Interface

```ts
interface Notification {
  id: string;
  userId: string;
  type: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
```

### Functions

#### `getNotifications(limit?)`

```ts
async getNotifications(limit: number = 20): Promise<Notification[]>
```

Returns the user's notifications, ordered by `created_at` descending, limited to `limit` results (default 20).

#### `getUnreadCount()`

```ts
async getUnreadCount(): Promise<number>
```

Returns the count of unread notifications. Uses `{ count: 'exact', head: true }` for an efficient count-only query without returning row data.

#### `markAsRead(notificationId)`

```ts
async markAsRead(notificationId: string): Promise<void>
```

Sets `read = true` for a single notification.

#### `markAllAsRead()`

```ts
async markAllAsRead(): Promise<void>
```

Sets `read = true` for all unread notifications belonging to the current user. Explicitly fetches the user ID and filters by both `user_id` and `read = false`. Returns silently if not authenticated.

#### `deleteNotification(notificationId)`

```ts
async deleteNotification(notificationId: string): Promise<void>
```

Hard-deletes a single notification.

---

## 7. payments.api.ts

**Export:** `paymentsApi`, `Payment` (interface)
**Tables:** `payments`, `courses`, `users`
**Edge Functions:** `refund-process`
**Auth required:** Yes (RLS scopes user queries; admin queries require ADMIN role)

### Payment Interface

```ts
interface Payment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'captured' | 'refunded' | 'failed';
  method: string | null;
  receiptNumber: string | null;
  refundId: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundedAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Joined fields (populated when using admin queries with joins)
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
}
```

### Functions

#### `getUserPayments(params?)`

```ts
async getUserPayments(params?: {
  page?: number;
  limit?: number;
}): Promise<{ payments: Payment[]; total: number }>
```

Paginated payment history for the current user. Joins `courses(title)` for the course title. Ordered by `created_at` descending. Limit capped at 100, default page size: 20.

#### `getPaymentByOrder(orderId)`

```ts
async getPaymentByOrder(orderId: string): Promise<Payment | null>
```

Looks up a payment by its Razorpay order ID (`razorpay_order_id`). Joins `courses(title)` and `users(name, email)`. Returns `null` if not found.

#### `getAdminPayments(params?)`

```ts
async getAdminPayments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{ payments: Payment[]; total: number }>
```

Paginated list of all payments (admin view). Supports:
- `status` filter: exact match on payment status
- `search` filter: `ilike` on `receipt_number` or `razorpay_payment_id`

Joins `users(name, email)` and `courses(title)`. Limit capped at 100, default page size: 20.

#### `processRefund(paymentId, reason)`

```ts
async processRefund(paymentId: string, reason: string): Promise<{
  refundId: string;
  amount: number;
  message: string;
}>
```

Invokes the `refund-process` Edge Function. Returns the Razorpay refund ID, refund amount, and a confirmation message on success.

---

## 8. certificates.api.ts

**Export:** `certificatesApi`
**Tables:** `certificates`
**Auth required:** Yes (`getUserCertificates` requires authentication; `getCertificate` is by ID)

### Internal Helpers

| Helper | Purpose |
|--------|---------|
| `mapRow(row)` | Maps DB row to `Certificate` type with camelCase fields. Parses `issueDate`, `completionDate`, `revokedAt`, `createdAt` as `Date` objects. Falls back `completionDate` to `issue_date` if `completion_date` is null. |

### Functions

#### `getUserCertificates()`

```ts
async getUserCertificates(): Promise<Certificate[]>
```

Returns all ACTIVE certificates for the current authenticated user, ordered by `created_at` descending. Throws `'Not authenticated'` if no user session exists (unlike other modules that return empty/null).

#### `getCertificate(id)`

```ts
async getCertificate(id: string): Promise<Certificate | null>
```

Returns a single certificate by ID, or `null` if not found. Does not filter by status -- returns both ACTIVE and REVOKED certificates. Uses `maybeSingle()`.

---

## 9. reviews.api.ts

**Export:** `reviewsApi`, `Review`, `ReviewSummary`, `ReviewsResponse` (interfaces)
**Tables:** `reviews`, `users`
**Auth required:** `createReview` and `updateReview` require authentication; `getCourseReviews` is public; `deleteReview` uses RLS

### Exported Types

```ts
interface ReviewUser {
  name: string;
  avatar: string;
}

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  helpful: number;
  user: ReviewUser;
  createdAt: string;
  updatedAt: string;
}

interface ReviewSummary {
  total: number;
  averageRating: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  summary: ReviewSummary;
  pagination: { hasMore: boolean };
}
```

### Functions

#### `getCourseReviews(courseId, page?, limit?)`

```ts
async getCourseReviews(courseId: string, page: number = 1, limit: number = 10): Promise<ReviewsResponse>
```

Returns paginated reviews for a course with computed summary statistics. Performs two queries:
1. **Paginated reviews:** Joins `users:user_id(name, avatar)` for reviewer info. Ordered by `created_at` descending.
2. **All ratings:** Fetches just `rating` for all reviews on the course to compute:
   - `total`: total review count
   - `averageRating`: mean of all ratings
   - `distribution`: count per star level (1-5)

`pagination.hasMore` is `true` when `count > offset + limit`.

#### `createReview(courseId, rating, comment)`

```ts
async createReview(courseId: string, rating: number, comment: string): Promise<{
  success: boolean;
  review: any;
}>
```

Creates a new review for the current user. Throws `'Not authenticated'` if no session. Inserts with `user_id`, `course_id`, `rating`, `comment`.

#### `updateReview(reviewId, rating, comment)`

```ts
async updateReview(reviewId: string, rating: number, comment: string): Promise<{
  success: boolean;
  review: any;
}>
```

Updates an existing review's `rating` and `comment`. RLS ensures users can only update their own reviews.

#### `deleteReview(reviewId)`

```ts
async deleteReview(reviewId: string): Promise<{ success: boolean }>
```

Hard-deletes a review. RLS ensures users can only delete their own reviews.

---

## 10. siteContent.api.ts

**Export:** `siteContentApi`
**Tables:** `site_content`
**Auth required:** Read operations are public; write operations require ADMIN role (enforced by RLS)

### Internal Helpers

| Helper | Purpose |
|--------|---------|
| `mapRow(row)` | Maps DB row to `SiteContentItem` type with camelCase fields: `orderIndex`, `isActive`, `createdAt`, `updatedAt`. |

### Functions

#### `getBySection(section)`

```ts
async getBySection(section: string): Promise<SiteContentItem[]>
```

Returns all ACTIVE content items for a specific section, ordered by `order_index` ascending. Filters: `section = section AND is_active = true`.

#### `getAll(params?)`

```ts
async getAll(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: SiteContentItem[]; total: number }>
```

Paginated list of all site content (including inactive). Ordered by `section` then `order_index`. Limit capped at 500, default page size: 100.

#### `create(item)`

```ts
async create(item: {
  section: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  orderIndex?: number;
  isActive?: boolean;
}): Promise<SiteContentItem>
```

Creates a new site content item and returns the created record. Defaults: `metadata = {}`, `orderIndex = 0`, `isActive = true`.

#### `update(id, updates)`

```ts
async update(id: string, updates: {
  title?: string;
  body?: string;
  metadata?: Record<string, any>;
  orderIndex?: number;
  isActive?: boolean;
}): Promise<SiteContentItem>
```

Selectively updates a site content item and returns the updated record.

#### `delete(id)`

```ts
async delete(id: string): Promise<void>
```

Hard-deletes a site content item.

#### `reorder(ids[])`

```ts
async reorder(ids: string[]): Promise<void>
```

Reorders content items by setting `order_index` based on array position (1-indexed). Executes all updates in parallel via `Promise.all()`.

---

## 11. users.api.ts

**Export:** `usersApi`, `mapUserProfile`
**Tables:** `users`
**Auth required:** `getCurrentUser` and `updatePhone`/`updateProfile` require authentication; `getUser` reads by ID

### Shared Helpers

| Helper | Purpose |
|--------|---------|
| `mapUserProfile(profile: UserRow): User` | Shared mapper for converting a DB user row to the frontend `User` type. Exported for DRY reuse by `AuthContext`. |

### Functions

#### `getCurrentUser()`

```ts
async getCurrentUser(): Promise<User | null>
```

Returns the full profile for the authenticated user. Fetches the auth user via `supabase.auth.getUser()`, then queries the `users` table for the complete profile. Returns `null` if not authenticated or profile not found. Returned fields:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `name` | `string` | |
| `email` | `string` | |
| `avatar` | `string` | Defaults to `''` if null |
| `phone_e164` | `string` | E.164 format |
| `role` | `string` | `'USER'` or `'ADMIN'` |
| `phoneVerified` | `boolean` | |
| `emailVerified` | `boolean` | |
| `google_id` | `string` | |
| `created_at` | `Date` | Parsed from string |
| `last_login_at` | `Date` | Parsed from string |

#### `getUser(userId)`

```ts
async getUser(userId: string): Promise<Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'role' | 'created_at'> | null>
```

Returns a limited public profile for any user by ID. Only selects: `id`, `name`, `email`, `avatar`, `role`, `created_at`. Returns `null` if not found.

#### `updatePhone(userId, phone)`

```ts
async updatePhone(userId: string, phone: string): Promise<void>
```

Updates the user's phone number. Performs E.164 validation before the database call:
- Regex: `/^\+[1-9]\d{1,14}$/`
- Throws `'Invalid E.164 format. Phone must start with + and country code.'` on validation failure

On success, also sets `phone_verified = true`.

#### `updateProfile(userId, data)`

```ts
async updateProfile(userId: string, data: { name?: string }): Promise<void>
```

Updates user profile fields. Currently supports `name` only. Throws `'Failed to update profile'` on error.

---

## Error Handling Patterns

All modules share consistent error handling conventions. Error utilities are defined in `utils/edgeFunctionError.ts`.

### Pattern 1: Supabase PostgREST Errors

Most direct database queries follow this pattern:

```ts
const { data, error } = await supabase.from('table').select('*');
if (error) throw new Error(error.message);
```

The Supabase client returns structured `{ data, error }` objects. Modules throw `new Error(error.message)` on failure, propagating the PostgreSQL error message to the caller.

### Pattern 2: Edge Function Error Extraction

Edge Function invocations use the `extractEdgeFnError()` utility from `utils/edgeFunctionError.ts`:

```ts
import { extractEdgeFnError } from '../../utils/edgeFunctionError';

const { data, error } = await supabase.functions.invoke('function-name', { body });
if (error) throw new Error(await extractEdgeFnError(error, 'Fallback message'));
if (!data?.success) throw new Error(data?.error || 'Fallback message');
```

**Why this is needed:** The Supabase SDK wraps Edge Function errors in `FunctionsHttpError` with a hardcoded message (`"Edge Function returned a non-2xx status code"`). The real error is buried in `error.context`, which is a raw `Response` object with an unconsumed body.

**`extractEdgeFnError(fnError, fallback)`** extracts the real message by:
1. Checking if `error.context` is a `Response` object
2. Cloning the response and attempting `JSON.parse()` to extract `error`, `message`, or `msg` fields
3. Falling back to `response.text()` if JSON parsing fails
4. Falling back to `error.context.error` / `.message` / `.msg` if context is a plain object
5. Falling back to `fnError.message` or the provided `fallback` string

### Pattern 3: JWT Expiry Detection and Session Refresh

The `isEdgeFnAuthError()` utility detects expired JWT tokens:

```ts
import { isEdgeFnAuthError } from '../../utils/edgeFunctionError';
```

**`isEdgeFnAuthError(fnError)`** returns `true` when:
- `error.context` is a `Response` with `status === 401`, **OR**
- `error.message` (lowercased) contains any of: `'invalid jwt'`, `'jwt expired'`, `'unauthorized'`, `'token is expired'`

**Retry pattern** (used in `adminApi.issueCertificate`):

```ts
let { data, error } = await supabase.functions.invoke('function-name', { body });
if (error) {
  if (isEdgeFnAuthError(error)) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Your session has expired. Please log in again.');
    // Retry the Edge Function call with refreshed token
    const retry = await supabase.functions.invoke('function-name', { body });
    data = retry.data;
    if (retry.error) throw new Error(await extractEdgeFnError(retry.error, 'Fallback'));
  } else {
    throw new Error(await extractEdgeFnError(error, 'Fallback'));
  }
}
```

### Pattern 4: Silent Failures for Optional Operations

Some functions return safe defaults instead of throwing when not authenticated:

| Function | Return on no auth |
|----------|-------------------|
| `enrollmentsApi.getUserEnrollments()` | `[]` |
| `enrollmentsApi.checkAccess()` | `false` |
| `enrollmentsApi.getEnrollment()` | `null` |
| `progressApi.saveProgress()` | `void` (returns silently) |
| `progressApi.getModuleProgress()` | `null` |
| `progressApi.getProgress()` | `[]` |
| `progressApi.getCourseStats()` | Zeroed `ProgressStats` object |
| `usersApi.getCurrentUser()` | `null` |

### Pattern 5: PostgreSQL Error Code Handling

Specific PostgreSQL error codes are caught for user-friendly messages:

```ts
if (error.code === '23505') throw new Error('User is already enrolled');  // unique violation
```

### Pagination Convention

Paginated endpoints follow a consistent pattern:

```ts
const page = params?.page || 1;
const limit = Math.min(params?.limit || defaultLimit, maxLimit);
const offset = (page - 1) * limit;
// ... query with .range(offset, offset + limit - 1)
// Returns: { ..., total: count || 0 }
```

| Module | Default Limit | Max Limit |
|--------|--------------|-----------|
| `adminApi.getUsers` | 20 | 100 |
| `adminApi.getCertificates` | 20 | 100 |
| `adminApi.getPayments` | 20 | 100 |
| `adminApi.getReviews` | 20 | 100 |
| `paymentsApi.getUserPayments` | 20 | 100 |
| `paymentsApi.getAdminPayments` | 20 | 100 |
| `siteContentApi.getAll` | 100 | 500 |
| `reviewsApi.getCourseReviews` | 10 | (no cap) |

---

## Barrel File Exports

The `services/api/index.ts` barrel file exports all modules and key types:

```ts
// Module objects + shared helpers
export { coursesApi } from './courses.api';
export { enrollmentsApi } from './enrollments.api';
export { progressApi, AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD } from './progress.api';
export { checkoutApi } from './checkout.api';
export { adminApi } from './admin.api';
export { notificationsApi, mapNotification } from './notifications.api';
export { siteContentApi } from './siteContent.api';
export { paymentsApi } from './payments.api';
export { certificatesApi } from './certificates.api';
export { reviewsApi } from './reviews.api';
export { usersApi, mapUserProfile } from './users.api';

// Re-exported types
export type { Notification } from './notifications.api';
export type { SiteContentItem } from '../../types';
export type { Payment } from './payments.api';
export type { Review, ReviewSummary, ReviewsResponse } from './reviews.api';
```
