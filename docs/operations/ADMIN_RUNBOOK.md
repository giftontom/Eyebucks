# ADMIN_RUNBOOK

> **Last updated:** 2026-03-14 | **Status:** Stable | **Scope:** Admin operations

Step-by-step procedures for every admin task. This is a "how to do X right now" guide, not
a feature description.

## Table of Contents

1. [User Management](#1-user-management)
2. [Course Management](#2-course-management)
3. [Payment Operations](#3-payment-operations)
4. [Certificate Operations](#4-certificate-operations)
5. [Coupon Management](#5-coupon-management)
6. [Content Management](#6-content-management)
7. [Audit Log](#7-audit-log)
8. [Database Maintenance](#8-database-maintenance)

---

## 1. User Management

### 1.1 Manually Enroll a User

**When to use:** Payment succeeded but enrollment was not created (webhook missed, Edge
Function timeout, user closed browser before callback fired).

**Steps:**
1. Navigate to Admin → Users, find the user
2. Open the user's detail page
3. Click "Enroll in Course"
4. Select the course and set status to `ACTIVE`
5. Enter the payment ID from the payment record if available
6. Click "Save"

**What happens:** An enrollment row is inserted in `enrollments` with `status='ACTIVE'`.
The user can immediately access the course.

**Verification:** Navigate to Admin → Users → [user] → Enrollments; confirm the course appears
with `ACTIVE` status.

**Caveats:** If the payment record is missing, create it first in Admin → Payments before
enrolling, to maintain a complete audit trail.

---

### 1.2 Revoke an Enrollment

**When to use:** Refund issued, enrollment obtained fraudulently, or admin decision.

**Steps:**
1. Navigate to Admin → Users → [user] → Enrollments
2. Find the enrollment row
3. Click "Revoke"
4. Confirm the action

**What happens:** `enrollment.status` changes to `REVOKED`. The user loses access to the
course immediately on their next page load.

**Verification:** Log in as the user (or use a test account) and confirm the course shows
the enrollment gate instead of the lesson view.

**Caveats:** Revocation is not automatically tied to a refund. Process the refund separately
in Admin → Payments if applicable.

---

### 1.3 Reset a User's Module Progress

**When to use:** User requests a fresh start; testing; data corruption.

**Steps:**
1. Open Supabase Dashboard → Table Editor → `progress`
2. Filter by `user_id` = [user UUID] and `course_id` = [course ID]
3. Delete the rows for the modules to reset (or all rows for the course)

**What happens:** Progress timestamps and completion flags are cleared. The video player
will start from 0 for those modules.

**Verification:** Ask the user to open the Learn page; modules should show as incomplete
with no resume position.

**Caveats:** `view_count` is stored in the same `progress` row; deleting the row resets
it too. This affects course analytics.

---

### 1.4 Promote a User to ADMIN

> **SECURITY WARNING:** Do NOT use the admin UI to change a user's role.
> [Known Issue #5](../../docs/project/KNOWN_ISSUES.md): the `users_update_own` RLS policy
> currently allows any user to update their own `role` column via a direct API call.
> Until a BEFORE UPDATE trigger is added, use the Supabase SQL Editor with the service role.

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   UPDATE public.users
   SET role = 'ADMIN'
   WHERE email = 'target@example.com';
   ```
3. Confirm the row count returned is `1`

**What happens:** The user's `role` column is set to `ADMIN`. The `is_admin()` function
will return `true` for this user, granting full RLS access.

**Verification:** Have the user log out and back in. They should see the Admin link in the nav.

**Caveats:** Admin access is permanent until explicitly revoked. Use sparingly.

---

### 1.5 Deactivate a User Account

**When to use:** User requests account deletion; abuse; compliance.

**Steps:**
1. Open Supabase Dashboard → Authentication → Users
2. Find the user by email
3. Click "Delete User"

**What happens:** The Supabase auth record is deleted. The `public.users` row is retained
for audit trail purposes (payments, enrollments reference it).

**Verification:** The user cannot log in. Their profile data is retained.

**Caveats:** Cascade deletes depend on FK `ON DELETE` rules. `enrollments`, `payments`,
and `certificates` reference `users(id)` without `ON DELETE CASCADE` — they are preserved.

---

## 2. Course Management

### 2.1 Publish a Draft Course

**When to use:** Course is ready for students.

**Steps:**
1. Navigate to Admin → Courses
2. Find the course (status: DRAFT)
3. Click the toggle or "Publish" button

**What happens:** `courses.status` changes to `PUBLISHED`. The course appears in the
Storefront and is purchasable.

**Verification:** Open the Storefront in an incognito window; confirm the course appears.

---

### 2.2 Unpublish a Course (Return to DRAFT)

**When to use:** Content needs updating; course temporarily unavailable.

**Steps:**
1. Navigate to Admin → Courses
2. Find the course (status: PUBLISHED)
3. Click "Unpublish" or toggle to DRAFT

**What happens:** `courses.status` changes to `DRAFT`. The course disappears from the
Storefront. Existing enrollments are unaffected — enrolled users can still access lessons.

**Verification:** Open Storefront; confirm course is not visible to unauthenticated users.

---

### 2.3 Soft-Delete a Course

**When to use:** Course is permanently retired.

**Steps:**
1. Navigate to Admin → Courses
2. Click "Delete" on the course

**What happens:** `courses.deleted_at` is set to `now()`. The course is hidden from all
queries that filter `deleted_at IS NULL`. Enrollments and payments are preserved.

**Verification:** Course no longer appears in admin course list or Storefront.

**Caveats:** This is a soft delete. To permanently delete, use Supabase SQL Editor with
`DELETE FROM courses WHERE id = '...'` — this will cascade-fail if enrollments exist.

---

### 2.4 Add and Reorder Modules

**When to use:** New lesson added; lesson order changed.

**Steps:**
1. Navigate to Admin → Courses → [course] → Edit
2. To add: click "Add Module", fill in title, video, duration
3. To reorder: drag modules to the desired order and click "Save Order"

**What happens:** Adding calls `INSERT INTO modules`. Reordering calls the
`reorder_modules(course_id, module_ids[])` RPC, which atomically updates `order_index`
for all modules.

**Verification:** Open Course Details page; modules appear in new order.

---

### 2.5 Reconfigure a Bundle

**When to use:** Adding or removing courses from a BUNDLE-type course.

**Steps:**
1. Navigate to Admin → Courses → [bundle course] → Edit
2. In the "Bundle Contents" section, add or remove courses
3. Click "Save Bundle"

**What happens:** The `set_bundle_courses(bundle_id, course_ids[])` RPC atomically
replaces all `bundle_courses` junction rows for this bundle.

**Caveats:** Removing a course from a bundle does not revoke access for users already
enrolled in the bundle.

---

## 3. Payment Operations

### 3.1 Issue a Full Refund

**When to use:** User requests refund within refund policy window.

**Steps:**
1. Navigate to Admin → Payments
2. Find the payment record
3. Click "Refund" → "Full Refund"
4. Confirm

**What happens:** The `refund-process` Edge Function calls the Razorpay Refund API,
then updates `payments.status` to `refunded`. The enrollment is revoked.

**Verification:** Check the payment row; `status` should be `refunded`. Check Razorpay
dashboard for the refund confirmation.

**Caveats:** Razorpay refund processing can take 5–7 business days to reach the user's account.

---

### 3.2 Issue a Partial Refund

**When to use:** Partial refund per policy (e.g., pro-rated).

**Steps:**
1. Navigate to Admin → Payments → [payment]
2. Click "Refund" → "Partial Refund"
3. Enter the refund amount in paise
4. Confirm

**What happens:** Razorpay processes a partial refund. The `payments` record is updated
with `refund_amount`. The enrollment is NOT automatically revoked for partial refunds.

**Verification:** Razorpay dashboard shows partial refund; `payments.refund_amount` is set.

---

### 3.3 Verify a Payment Record Manually

**When to use:** Student claims they paid but no enrollment was created; webhook may have
failed.

**Steps:**
1. Get the Razorpay Payment ID from the student
2. Open Razorpay Dashboard → Payments → search by Payment ID
3. Confirm `status = captured` and `amount` matches the course price
4. If payment is captured: manually enroll the student (see §1.1) and create a payment
   record in Supabase

**Caveats:** The webhook fallback (`checkout-webhook`) should have handled this. If it
did not, check Edge Function logs for errors.

---

### 3.4 Handle a Disputed or Failed Payment

**When to use:** Razorpay reports a dispute or payment failure.

**Steps:**
1. Check Razorpay Dashboard for dispute details
2. If failed (not captured): payment record shows `status = failed`; no enrollment was created
3. If disputed: do not process a refund until Razorpay resolves the dispute
4. Log the incident in `audit_logs` if manual action is taken

---

## 4. Certificate Operations

### 4.1 Manually Issue a Certificate

**When to use:** Student completed a course but certificate was not generated (Edge Function
error).

**Steps:**
1. Navigate to Admin → Certificates
2. Click "Issue Certificate"
3. Select user and course
4. Click "Generate"

**What happens:** The `certificate-generate` Edge Function is called, which generates the
PDF and sends the email.

**Verification:** Certificate appears in Admin → Certificates and in the user's Profile page.

---

### 4.2 Revoke a Certificate

**When to use:** Certificate issued in error; course completion invalidated.

**Steps:**
1. Navigate to Admin → Certificates
2. Find the certificate
3. Click "Revoke"

**What happens:** `certificates.status` changes to `REVOKED`. The certificate is no longer
valid and the download URL returns an error.

---

### 4.3 Re-Generate After Name Correction

**When to use:** Student's name was incorrect at time of completion.

**Steps:**
1. Update the user's name in Admin → Users → [user] → Edit
2. Navigate to Admin → Certificates → [certificate]
3. Click "Regenerate"

**What happens:** A new certificate PDF is generated with the corrected name.
The old certificate is overwritten.

---

## 5. Coupon Management

### 5.1 Create a Coupon Code

**Steps:**
1. Navigate to Admin → Coupons
2. Click "Create Coupon"
3. Fill in: code (uppercase), discount percentage, max uses, expiry date
4. Click "Save"

**What happens:** A row is inserted in `coupons` with `is_active = true`.

**Verification:** Use the coupon code on the Checkout page to confirm it applies correctly.

---

### 5.2 Deactivate a Coupon

**Steps:**
1. Navigate to Admin → Coupons
2. Find the coupon
3. Click "Deactivate"

**What happens:** `coupons.is_active` is set to `false`. The `apply_coupon` RPC will
reject this code immediately.

---

### 5.3 Check Coupon Usage Statistics

**Steps:**
1. Navigate to Admin → Coupons → [coupon]
2. Check `use_count` vs `max_uses`
3. For per-user breakdown: Supabase SQL Editor:
   ```sql
   SELECT u.email, cu.used_at, cu.discount_pct
   FROM coupon_uses cu
   JOIN users u ON u.id = cu.user_id
   WHERE cu.coupon_id = '[coupon-id]'
   ORDER BY cu.used_at DESC;
   ```

---

## 6. Content Management

### 6.1 Update FAQ Entries

**Steps:**
1. Navigate to Admin → Content → FAQ
2. Edit existing entries or add new ones
3. Save

**What happens:** Updates `site_content` rows with `section = 'faq'`.

---

### 6.2 Add / Remove Testimonials

**Steps:**
1. Navigate to Admin → Content → Testimonials
2. Add or remove testimonial entries
3. Save

**What happens:** Updates `site_content` rows with `section = 'testimonial'`.

---

### 6.3 Update the Announcement Banner

**Steps:**
1. Navigate to Admin → Content → Banner
2. Edit the banner text
3. Toggle "Active" to show/hide
4. Save

**What happens:** Updates `site_content` row with `section = 'banner'`.
The `AnnouncementBanner` component reads this on the Storefront.

---

### 6.4 Change the Featured Course

**Steps:**
1. Navigate to Admin → Settings
2. Find "Featured Course" setting
3. Select the desired course
4. Save

**What happens:** Updates the `site_content` settings row. The HeroCarousel on the
Storefront will feature this course.

---

## 7. Audit Log

### 7.1 Find Actions by a Specific Admin

```sql
SELECT al.action, al.entity_type, al.entity_id, al.created_at
FROM audit_logs al
JOIN users u ON u.id = al.admin_id
WHERE u.email = 'admin@eyebuckz.com'
ORDER BY al.created_at DESC
LIMIT 50;
```

### 7.2 Find Who Changed a Specific Record

```sql
SELECT al.*, u.email as admin_email
FROM audit_logs al
LEFT JOIN users u ON u.id = al.admin_id
WHERE al.entity_type = 'course'
  AND al.entity_id = '[course-id]'
ORDER BY al.created_at DESC;
```

---

## 8. Database Maintenance

### 8.1 Manually Run expire_enrollments()

**When to use:** pg_cron is not configured; manual check needed.

```sql
SELECT expire_enrollments();
-- Returns: integer count of enrollments expired
```

### 8.2 Verify pg_cron Job Status

```sql
SELECT jobname, schedule, active, jobid
FROM cron.job
WHERE jobname = 'expire-enrollments';
```

If no row is returned, set up the cron job:
```sql
SELECT cron.schedule(
  'expire-enrollments',
  '0 0 * * *',  -- daily at midnight UTC
  'SELECT expire_enrollments()'
);
```
