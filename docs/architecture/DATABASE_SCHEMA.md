# Eyebuckz LMS -- Database Schema Reference

> **Database:** Supabase PostgreSQL (with RLS, pg_cron, Storage)
> **Last updated:** 2026-03-03
> **Migration count:** 12 (001 through 012)

---

## Table of Contents

1. [Enums](#enums)
2. [Tables](#tables)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Foreign Keys](#foreign-keys)
5. [RLS Policies](#rls-policies)
6. [Database Functions](#database-functions)
7. [Triggers](#triggers)
8. [Indexes](#indexes)
9. [Scheduled Jobs](#scheduled-jobs)
10. [Storage Buckets](#storage-buckets)
11. [Migration History](#migration-history)

---

## Enums

| Enum                | Values                                                           |
|---------------------|------------------------------------------------------------------|
| `user_role`         | `USER`, `ADMIN`                                                  |
| `course_type`       | `BUNDLE`, `MODULE`                                               |
| `course_status`     | `PUBLISHED`, `DRAFT`                                             |
| `enrollment_status` | `ACTIVE`, `EXPIRED`, `REVOKED`, `PENDING`                        |
| `certificate_status`| `ACTIVE`, `REVOKED`                                              |
| `notification_type` | `enrollment`, `milestone`, `certificate`, `announcement`, `review`|

---

## Tables

12 active tables, 2 dropped (sessions, refresh_tokens -- dropped in migration 009).

### 1. `users`

Linked 1:1 to Supabase Auth. Created automatically by the `handle_new_user()` trigger on `auth.users` INSERT.

| Column                 | Type          | Constraints / Default                              |
|------------------------|---------------|-----------------------------------------------------|
| `id`                   | `UUID`        | **PK**, FK -> `auth.users(id)` ON DELETE CASCADE    |
| `name`                 | `TEXT`        | NOT NULL                                            |
| `email`                | `TEXT`        | UNIQUE, NOT NULL                                    |
| `avatar`               | `TEXT`        |                                                     |
| `phone_e164`           | `TEXT`        |                                                     |
| `google_id`            | `TEXT`        | UNIQUE                                              |
| `role`                 | `user_role`   | DEFAULT `'USER'`                                    |
| `phone_verified`       | `BOOLEAN`     | DEFAULT `false`                                     |
| `email_verified`       | `BOOLEAN`     | DEFAULT `false`                                     |
| `is_active`            | `BOOLEAN`     | DEFAULT `true`                                      |
| `failed_login_attempts`| `INTEGER`     | DEFAULT `0`                                         |
| `locked_until`         | `TIMESTAMPTZ` |                                                     |
| `last_login_at`        | `TIMESTAMPTZ` |                                                     |
| `created_at`           | `TIMESTAMPTZ` | DEFAULT `now()`                                     |
| `updated_at`           | `TIMESTAMPTZ` | DEFAULT `now()`                                     |

### 2. `courses`

| Column           | Type            | Constraints / Default                                     |
|------------------|-----------------|-----------------------------------------------------------|
| `id`             | `TEXT`          | **PK**, DEFAULT `gen_random_uuid()::text`                 |
| `slug`           | `TEXT`          | UNIQUE, NOT NULL                                          |
| `title`          | `TEXT`          | NOT NULL                                                  |
| `description`    | `TEXT`          | NOT NULL                                                  |
| `price`          | `INTEGER`       | NOT NULL, CHECK `>= 0` (stored in paise)                 |
| `thumbnail`      | `TEXT`          | NOT NULL, DEFAULT `''`                                    |
| `hero_video_id`  | `TEXT`          |                                                           |
| `type`           | `course_type`   | NOT NULL                                                  |
| `status`         | `course_status` | DEFAULT `'DRAFT'`                                         |
| `rating`         | `REAL`          | CHECK `NULL OR (0 <= rating <= 5)`                        |
| `total_students` | `INTEGER`       | DEFAULT `0`, CHECK `>= 0`                                |
| `features`       | `TEXT[]`        | DEFAULT `'{}'`                                            |
| `published_at`   | `TIMESTAMPTZ`   |                                                           |
| `deleted_at`     | `TIMESTAMPTZ`   | DEFAULT `NULL` (soft delete, added in migration 006)      |
| `created_at`     | `TIMESTAMPTZ`   | DEFAULT `now()`                                           |
| `updated_at`     | `TIMESTAMPTZ`   | DEFAULT `now()`                                           |

### 3. `modules`

| Column             | Type          | Constraints / Default                              |
|--------------------|---------------|-----------------------------------------------------|
| `id`               | `TEXT`        | **PK**, DEFAULT `gen_random_uuid()::text`           |
| `course_id`        | `TEXT`        | NOT NULL, FK -> `courses(id)` ON DELETE CASCADE     |
| `title`            | `TEXT`        | NOT NULL                                            |
| `duration`         | `TEXT`        |                                                     |
| `duration_seconds` | `INTEGER`     | DEFAULT `0`                                         |
| `video_url`        | `TEXT`        |                                                     |
| `is_free_preview`  | `BOOLEAN`     | DEFAULT `false`                                     |
| `order_index`      | `INTEGER`     | NOT NULL                                            |
| `created_at`       | `TIMESTAMPTZ` | DEFAULT `now()`                                     |
| `updated_at`       | `TIMESTAMPTZ` | DEFAULT `now()`                                     |

### 4. `enrollments`

| Column              | Type                | Constraints / Default                               |
|---------------------|---------------------|------------------------------------------------------|
| `id`                | `TEXT`              | **PK**, DEFAULT `gen_random_uuid()::text`            |
| `user_id`           | `UUID`              | NOT NULL, FK -> `users(id)` ON DELETE CASCADE        |
| `course_id`         | `TEXT`              | NOT NULL, FK -> `courses(id)` ON DELETE CASCADE      |
| `status`            | `enrollment_status` | DEFAULT `'ACTIVE'`                                   |
| `payment_id`        | `TEXT`              |                                                      |
| `order_id`          | `TEXT`              |                                                      |
| `amount`            | `INTEGER`           | DEFAULT `0`, CHECK `>= 0`                           |
| `expires_at`        | `TIMESTAMPTZ`       |                                                      |
| `completed_modules` | `TEXT[]`            | DEFAULT `'{}'`                                       |
| `current_module`    | `TEXT`              |                                                      |
| `overall_percent`   | `INTEGER`           | DEFAULT `0`                                          |
| `total_watch_time`  | `INTEGER`           | DEFAULT `0`                                          |
| `enrolled_at`       | `TIMESTAMPTZ`       | DEFAULT `now()`                                      |
| `last_accessed_at`  | `TIMESTAMPTZ`       |                                                      |
| `created_at`        | `TIMESTAMPTZ`       | DEFAULT `now()`                                      |
| `updated_at`        | `TIMESTAMPTZ`       | DEFAULT `now()`                                      |

**Unique constraint:** `(user_id, course_id)`

### 5. `progress`

| Column            | Type          | Constraints / Default                                     |
|-------------------|---------------|-----------------------------------------------------------|
| `id`              | `TEXT`        | **PK**, DEFAULT `gen_random_uuid()::text`                 |
| `user_id`         | `UUID`        | NOT NULL, FK -> `users(id)` ON DELETE CASCADE             |
| `course_id`       | `TEXT`        | NOT NULL, FK -> `courses(id)` ON DELETE CASCADE           |
| `module_id`       | `TEXT`        | NOT NULL, FK -> `modules(id)` ON DELETE CASCADE           |
| `timestamp`       | `INTEGER`     | DEFAULT `0` (last watched position in seconds)            |
| `completed`       | `BOOLEAN`     | DEFAULT `false`                                           |
| `completed_at`    | `TIMESTAMPTZ` |                                                           |
| `watch_time`      | `INTEGER`     | DEFAULT `0`, CHECK `>= 0` (total seconds watched)        |
| `view_count`      | `INTEGER`     | DEFAULT `0`                                               |
| `last_updated_at` | `TIMESTAMPTZ` | DEFAULT `now()`                                           |
| `created_at`      | `TIMESTAMPTZ` | DEFAULT `now()`                                           |
| `updated_at`      | `TIMESTAMPTZ` | DEFAULT `now()`                                           |

**Unique constraint:** `(user_id, course_id, module_id)`

### 6. `certificates`

| Column              | Type                 | Constraints / Default                              |
|---------------------|----------------------|-----------------------------------------------------|
| `id`                | `TEXT`               | **PK**, DEFAULT `gen_random_uuid()::text`           |
| `user_id`           | `UUID`               | NOT NULL, FK -> `users(id)` ON DELETE CASCADE       |
| `course_id`         | `TEXT`               | NOT NULL, FK -> `courses(id)` ON DELETE CASCADE     |
| `certificate_number`| `TEXT`               | UNIQUE, NOT NULL                                    |
| `student_name`      | `TEXT`               | NOT NULL                                            |
| `course_title`      | `TEXT`               | NOT NULL                                            |
| `issue_date`        | `TIMESTAMPTZ`        | NOT NULL, DEFAULT `now()`                           |
| `completion_date`   | `TIMESTAMPTZ`        | NOT NULL, DEFAULT `now()`                           |
| `download_url`      | `TEXT`               |                                                     |
| `pdf_data`          | `BYTEA`              |                                                     |
| `status`            | `certificate_status` | DEFAULT `'ACTIVE'`                                  |
| `revoked_at`        | `TIMESTAMPTZ`        |                                                     |
| `revoked_reason`    | `TEXT`               |                                                     |
| `created_at`        | `TIMESTAMPTZ`        | DEFAULT `now()`                                     |

**Unique constraint:** `(user_id, course_id)`

### 7. `reviews`

| Column      | Type          | Constraints / Default                              |
|-------------|---------------|-----------------------------------------------------|
| `id`        | `TEXT`        | **PK**, DEFAULT `gen_random_uuid()::text`           |
| `user_id`   | `UUID`        | NOT NULL, FK -> `users(id)` ON DELETE CASCADE       |
| `course_id` | `TEXT`        | NOT NULL, FK -> `courses(id)` ON DELETE CASCADE     |
| `rating`    | `INTEGER`     | NOT NULL, CHECK `1 <= rating <= 5`                  |
| `comment`   | `TEXT`        |                                                     |
| `helpful`   | `INTEGER`     | DEFAULT `0`                                         |
| `created_at`| `TIMESTAMPTZ` | DEFAULT `now()`                                     |
| `updated_at`| `TIMESTAMPTZ` | DEFAULT `now()`                                     |

**Unique constraint:** `(user_id, course_id)` -- one review per user per course.
**Trigger:** `reviews_update_rating` recalculates `courses.rating` on INSERT/UPDATE/DELETE.

### 8. `notifications`

| Column      | Type                | Constraints / Default                              |
|-------------|---------------------|-----------------------------------------------------|
| `id`        | `TEXT`              | **PK**, DEFAULT `gen_random_uuid()::text`           |
| `user_id`   | `UUID`              | NOT NULL, FK -> `users(id)` ON DELETE CASCADE       |
| `type`      | `notification_type` | NOT NULL                                            |
| `title`     | `TEXT`              | NOT NULL                                            |
| `message`   | `TEXT`              | NOT NULL                                            |
| `link`      | `TEXT`              |                                                     |
| `read`      | `BOOLEAN`           | DEFAULT `false`                                     |
| `created_at`| `TIMESTAMPTZ`       | DEFAULT `now()`                                     |

### 9. `payments`

Added in migration 006. Tracks Razorpay transactions, receipts, and refunds.

| Column                | Type          | Constraints / Default                                        |
|-----------------------|---------------|---------------------------------------------------------------|
| `id`                  | `TEXT`        | **PK**, DEFAULT `gen_random_uuid()::text`                    |
| `user_id`             | `UUID`        | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE           |
| `course_id`           | `TEXT`        | FK -> `courses(id)` ON DELETE CASCADE (nullable for failures)|
| `enrollment_id`       | `TEXT`        | FK -> `enrollments(id)` ON DELETE SET NULL                   |
| `razorpay_order_id`   | `TEXT`        |                                                              |
| `razorpay_payment_id` | `TEXT`        | UNIQUE (partial index, WHERE NOT NULL)                       |
| `amount`              | `INTEGER`     | NOT NULL, DEFAULT `0`, CHECK `>= 0`                         |
| `currency`            | `TEXT`        | NOT NULL, DEFAULT `'INR'`                                    |
| `status`              | `TEXT`        | NOT NULL, DEFAULT `'pending'`, CHECK IN (`pending`, `captured`, `refunded`, `failed`) |
| `method`              | `TEXT`        |                                                              |
| `receipt_number`      | `TEXT`        |                                                              |
| `refund_id`           | `TEXT`        |                                                              |
| `refund_amount`       | `INTEGER`     | CHECK `NULL OR (>= 0 AND <= amount)`                        |
| `refund_reason`       | `TEXT`        |                                                              |
| `refunded_at`         | `TIMESTAMPTZ` |                                                              |
| `metadata`            | `JSONB`       | DEFAULT `'{}'`                                               |
| `created_at`          | `TIMESTAMPTZ` | DEFAULT `now()`                                              |
| `updated_at`          | `TIMESTAMPTZ` | DEFAULT `now()`                                              |

### 10. `bundle_courses`

Join table linking bundles to their constituent courses. Added in migration 007.

| Column       | Type          | Constraints / Default                              |
|--------------|---------------|-----------------------------------------------------|
| `bundle_id`  | `TEXT`        | **PK (composite)**, FK -> `courses(id)` ON DELETE CASCADE |
| `course_id`  | `TEXT`        | **PK (composite)**, FK -> `courses(id)` ON DELETE CASCADE |
| `order_index`| `INTEGER`     | NOT NULL, DEFAULT `0`                               |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()`                                     |

**Check constraint:** `bundle_id <> course_id` (no self-referencing bundles).

### 11. `site_content`

CMS-driven content for FAQs, testimonials, and showcase items. Added in migration 006.

| Column       | Type          | Constraints / Default                                                 |
|--------------|---------------|------------------------------------------------------------------------|
| `id`         | `UUID`        | **PK**, DEFAULT `gen_random_uuid()`                                   |
| `section`    | `TEXT`        | NOT NULL, CHECK IN (`faq`, `testimonial`, `showcase`)                 |
| `title`      | `TEXT`        | NOT NULL                                                              |
| `body`       | `TEXT`        | NOT NULL, DEFAULT `''`                                                |
| `metadata`   | `JSONB`       | DEFAULT `'{}'`                                                        |
| `order_index`| `INTEGER`     | NOT NULL, DEFAULT `0`                                                 |
| `is_active`  | `BOOLEAN`     | NOT NULL, DEFAULT `true`                                              |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()`                                                       |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `now()`                                                       |

### 12. `login_attempts`

Rate-limiting and audit trail for authentication attempts.

| Column       | Type          | Constraints / Default                              |
|--------------|---------------|-----------------------------------------------------|
| `id`         | `TEXT`        | **PK**, DEFAULT `gen_random_uuid()::text`           |
| `user_id`    | `UUID`        | FK -> `users(id)` ON DELETE SET NULL                |
| `email`      | `TEXT`        |                                                     |
| `ip_address` | `TEXT`        |                                                     |
| `user_agent` | `TEXT`        |                                                     |
| `success`    | `BOOLEAN`     | NOT NULL                                            |
| `fail_reason`| `TEXT`        |                                                     |
| `attempt_at` | `TIMESTAMPTZ` | DEFAULT `now()`                                     |

### Dropped Tables

| Table             | Dropped In    | Reason                                              |
|-------------------|---------------|------------------------------------------------------|
| `sessions`        | Migration 009 | Supabase Auth manages sessions natively              |
| `refresh_tokens`  | Migration 009 | Supabase Auth manages refresh tokens natively        |

---

## Entity Relationship Diagram

```
                              auth.users
                                  |
                                  | 1:1 (id)
                                  v
    +-------------------------------------------------------------+
    |                          users                               |
    |  id (UUID PK) | email | name | role | google_id | ...       |
    +-------------------------------------------------------------+
         |          |          |          |           |
         |1:N       |1:N       |1:N       |1:N        |1:N
         v          v          v          v           v
    enrollments  progress  certificates  reviews  notifications
         |          |
         |          |
         +----+-----+
              |
              v (N:1)
    +-------------------------------------------------------------+
    |                         courses                              |
    |  id (TEXT PK) | slug | title | price | type | status | ...  |
    +-------------------------------------------------------------+
         |                    |                    |
         |1:N                 |M:N                 |1:N
         v                    v                    v
      modules          bundle_courses          payments
                    (bundle_id, course_id)

    login_attempts -----> users (optional FK, ON DELETE SET NULL)
    site_content (standalone, no FK)

    storage.objects (certificates bucket) -- accessed via Supabase Storage API
```

### Detailed Relationships

```
users ──────1:N──────> enrollments       (user_id)
users ──────1:N──────> progress          (user_id)
users ──────1:N──────> certificates      (user_id)
users ──────1:N──────> reviews           (user_id)
users ──────1:N──────> notifications     (user_id)
users ──────1:N──────> login_attempts    (user_id, nullable)

courses ────1:N──────> modules           (course_id)
courses ────1:N──────> enrollments       (course_id)
courses ────1:N──────> certificates      (course_id)
courses ────1:N──────> reviews           (course_id)
courses ────1:N──────> payments          (course_id)

courses ────M:N──────> courses           (via bundle_courses)

modules ────1:N──────> progress          (module_id)

enrollments ─1:N─────> payments          (enrollment_id, nullable)

auth.users ──1:1─────> users             (id)
auth.users ──1:N─────> payments          (user_id)
```

---

## Foreign Keys

19 foreign key relationships across all tables.

| # | Source Table      | Source Column    | Target Table    | Target Column | ON DELETE   |
|---|-------------------|------------------|-----------------|---------------|-------------|
| 1 | `users`           | `id`             | `auth.users`    | `id`          | CASCADE     |
| 2 | `modules`         | `course_id`      | `courses`       | `id`          | CASCADE     |
| 3 | `enrollments`     | `user_id`        | `users`         | `id`          | CASCADE     |
| 4 | `enrollments`     | `course_id`      | `courses`       | `id`          | CASCADE     |
| 5 | `progress`        | `user_id`        | `users`         | `id`          | CASCADE     |
| 6 | `progress`        | `course_id`      | `courses`       | `id`          | CASCADE     |
| 7 | `progress`        | `module_id`      | `modules`       | `id`          | CASCADE     |
| 8 | `certificates`    | `user_id`        | `users`         | `id`          | CASCADE     |
| 9 | `certificates`    | `course_id`      | `courses`       | `id`          | CASCADE     |
| 10| `reviews`         | `user_id`        | `users`         | `id`          | CASCADE     |
| 11| `reviews`         | `course_id`      | `courses`       | `id`          | CASCADE     |
| 12| `notifications`   | `user_id`        | `users`         | `id`          | CASCADE     |
| 13| `payments`        | `user_id`        | `auth.users`    | `id`          | CASCADE     |
| 14| `payments`        | `course_id`      | `courses`       | `id`          | CASCADE     |
| 15| `payments`        | `enrollment_id`  | `enrollments`   | `id`          | SET NULL    |
| 16| `bundle_courses`  | `bundle_id`      | `courses`       | `id`          | CASCADE     |
| 17| `bundle_courses`  | `course_id`      | `courses`       | `id`          | CASCADE     |
| 18| `login_attempts`  | `user_id`        | `users`         | `id`          | SET NULL    |
| 19| `progress`        | `course_id`      | `courses`       | `id`          | CASCADE     |

Note: FK #6 was implicit in the original schema; FK #19 was explicitly added in migration 008 (`progress_course_id_fkey`). Both target the same column -- the explicit constraint from migration 008 is the active one.

---

## RLS Policies

All 12 active tables have Row-Level Security enabled. Policies are enforced on every query made through the Supabase client (anon/authenticated roles). Edge Functions using `service_role` bypass RLS entirely.

### Policy Matrix

| Table              | SELECT                                      | INSERT                              | UPDATE                          | DELETE                           |
|--------------------|---------------------------------------------|--------------------------------------|---------------------------------|----------------------------------|
| `users`            | Own record; Admin sees all                  | Own id OR admin                      | Own record; Admin any           | --                               |
| `courses`          | Published + not soft-deleted; Admin sees all| Admin only                           | Admin only                      | Admin only                       |
| `modules`          | Modules of published courses; Admin sees all| Admin only                           | Admin only                      | Admin only                       |
| `enrollments`      | Own OR admin                                | Own OR admin                         | Own OR admin                    | Admin only                       |
| `progress`         | Own OR admin                                | Own only                             | Own only                        | Own OR admin                     |
| `certificates`     | Own (ACTIVE status only); Admin sees all    | Admin only                           | Admin only                      | Admin only                       |
| `reviews`          | Public (all users)                          | Own only                             | Own only                        | Own OR admin                     |
| `notifications`    | Own only                                    | Admin only                           | Own only                        | Own only                         |
| `payments`         | Own only; Admin sees all (via FOR ALL)      | Admin only (via FOR ALL)             | Admin only (via FOR ALL)        | Admin only (via FOR ALL)         |
| `bundle_courses`   | Public (all users)                          | Admin only                           | Admin only                      | Admin only                       |
| `site_content`     | Active items (public); Admin sees all (via FOR ALL) | Admin only (via FOR ALL) | Admin only (via FOR ALL)        | Admin only (via FOR ALL)         |
| `login_attempts`   | Admin only                                  | Admin only                           | --                              | --                               |

### Full Policy List (49 policies)

**users (4 policies)**
| Policy                | Operation | Rule                                    |
|-----------------------|-----------|-----------------------------------------|
| `users_select_own`    | SELECT    | `id = auth.uid()`                       |
| `users_select_admin`  | SELECT    | `is_admin()`                            |
| `users_update_own`    | UPDATE    | `id = auth.uid()`                       |
| `users_update_admin`  | UPDATE    | `is_admin()`                            |
| `users_insert`        | INSERT    | `id = auth.uid() OR is_admin()`         |

**courses (4 policies)**
| Policy                | Operation | Rule                                            |
|-----------------------|-----------|-------------------------------------------------|
| `courses_select`      | SELECT    | `(status='PUBLISHED' AND deleted_at IS NULL) OR is_admin()` |
| `courses_insert`      | INSERT    | `is_admin()`                                    |
| `courses_update`      | UPDATE    | `is_admin()`                                    |
| `courses_delete`      | DELETE    | `is_admin()`                                    |

**modules (4 policies)**
| Policy                | Operation | Rule                                                         |
|-----------------------|-----------|--------------------------------------------------------------|
| `modules_select`      | SELECT    | Course is `PUBLISHED` or `is_admin()`                        |
| `modules_insert`      | INSERT    | `is_admin()`                                                 |
| `modules_update`      | UPDATE    | `is_admin()`                                                 |
| `modules_delete`      | DELETE    | `is_admin()`                                                 |

**enrollments (4 policies)**
| Policy                  | Operation | Rule                                   |
|-------------------------|-----------|----------------------------------------|
| `enrollments_select`    | SELECT    | `user_id = auth.uid() OR is_admin()`   |
| `enrollments_insert`    | INSERT    | `user_id = auth.uid() OR is_admin()`   |
| `enrollments_update`    | UPDATE    | `user_id = auth.uid() OR is_admin()`   |
| `enrollments_delete`    | DELETE    | `is_admin()`                           |

**progress (4 policies)**
| Policy                | Operation | Rule                                   |
|-----------------------|-----------|-----------------------------------------|
| `progress_select`     | SELECT    | `user_id = auth.uid() OR is_admin()`   |
| `progress_insert`     | INSERT    | `user_id = auth.uid()`                 |
| `progress_update`     | UPDATE    | `user_id = auth.uid()`                 |
| `progress_delete`     | DELETE    | `user_id = auth.uid() OR is_admin()`   |

**certificates (4 policies)**
| Policy                      | Operation | Rule                                              |
|-----------------------------|-----------|---------------------------------------------------|
| `certificates_select_own`   | SELECT    | `user_id = auth.uid() AND status = 'ACTIVE'`      |
| `certificates_select_admin` | SELECT    | `is_admin()`                                       |
| `certificates_insert`       | INSERT    | `is_admin()`                                       |
| `certificates_update`       | UPDATE    | `is_admin()`                                       |
| `certificates_delete`       | DELETE    | `is_admin()`                                       |

**reviews (4 policies)**
| Policy                | Operation | Rule                                   |
|-----------------------|-----------|-----------------------------------------|
| `reviews_select`      | SELECT    | `true` (public)                        |
| `reviews_insert`      | INSERT    | `user_id = auth.uid()`                 |
| `reviews_update`      | UPDATE    | `user_id = auth.uid()`                 |
| `reviews_delete`      | DELETE    | `user_id = auth.uid() OR is_admin()`   |

**notifications (4 policies)**
| Policy                    | Operation | Rule                      |
|---------------------------|-----------|---------------------------|
| `notifications_select`    | SELECT    | `user_id = auth.uid()`    |
| `notifications_insert`    | INSERT    | `is_admin()`              |
| `notifications_update`    | UPDATE    | `user_id = auth.uid()`    |
| `notifications_delete`    | DELETE    | `user_id = auth.uid()`    |

**payments (2 policies)**
| Policy                | Operation | Rule                      |
|-----------------------|-----------|---------------------------|
| `payments_user_read`  | SELECT    | `auth.uid() = user_id`    |
| `payments_admin_all`  | ALL       | `is_admin()`              |

**bundle_courses (4 policies)**
| Policy                          | Operation | Rule           |
|---------------------------------|-----------|----------------|
| `bundle_courses_public_read`    | SELECT    | `true` (public)|
| `bundle_courses_admin_insert`   | INSERT    | `is_admin()`   |
| `bundle_courses_admin_update`   | UPDATE    | `is_admin()`   |
| `bundle_courses_admin_delete`   | DELETE    | `is_admin()`   |

**site_content (2 policies)**
| Policy                      | Operation | Rule                       |
|-----------------------------|-----------|----------------------------|
| `site_content_public_read`  | SELECT    | `is_active = true`         |
| `site_content_admin_all`    | ALL       | `is_admin()`               |

**login_attempts (2 policies)**
| Policy                     | Operation | Rule           |
|----------------------------|-----------|----------------|
| `login_attempts_select`    | SELECT    | `is_admin()`   |
| `login_attempts_insert`    | INSERT    | `is_admin()`   |

**Storage: certificates bucket (3 policies)**
| Policy          | Operation | Rule                                                       |
|-----------------|-----------|-------------------------------------------------------------|
| `cert_download` | SELECT    | `bucket_id = 'certificates' AND uid matches folder`        |
| `cert_upload`   | INSERT    | `bucket_id = 'certificates'` (service_role uploads)        |
| `cert_delete`   | DELETE    | `bucket_id = 'certificates'` (service_role deletes)        |

---

## Database Functions

14 functions across the schema.

### Helper Functions

| # | Function                  | Returns     | Security  | Description                                              |
|---|---------------------------|-------------|-----------|----------------------------------------------------------|
| 1 | `is_admin()`              | `BOOLEAN`   | DEFINER   | Returns `true` if `auth.uid()` has role `ADMIN` in `users`. Used in every RLS policy that grants admin access. Marked `STABLE`. |
| 2 | `update_updated_at()`     | `TRIGGER`   | --        | Sets `NEW.updated_at = now()` before UPDATE. Attached to 10 tables. |
| 3 | `generate_receipt_number()`| `TEXT`      | --        | Returns format `EYB-YYYYMMDD-XXXXX` where XXXXX is a random 5-digit number. |

### Business Logic Functions (RPC)

| # | Function                                                             | Returns    | Security  | Description                                                                                                    |
|---|----------------------------------------------------------------------|------------|-----------|----------------------------------------------------------------------------------------------------------------|
| 4 | `complete_module(p_user_id UUID, p_module_id TEXT, p_course_id TEXT)` | `JSONB`    | DEFINER   | Atomic module completion. Validates module-course relationship, locks enrollment row (`FOR UPDATE`), marks progress complete, recalculates `overall_percent`, updates `completed_modules` array. Returns `{completed_count, total_modules, percent, enrollment_id}`. |
| 5 | `get_admin_stats()`                                                   | `JSONB`    | DEFINER   | Aggregates dashboard stats: total users, active users (30d), total revenue, published courses, draft courses, active enrollments, active certificates. |
| 6 | `get_sales_data(p_days INTEGER DEFAULT 30)`                           | `TABLE(date DATE, amount BIGINT, count INTEGER)` | DEFINER | Returns daily enrollment revenue and count for the past N days. |
| 7 | `get_recent_activity(p_limit INTEGER DEFAULT 10)`                     | `JSONB`    | DEFINER   | Returns `{recentEnrollments, recentCertificates}` with user/course details, ordered by most recent. |
| 8 | `get_progress_stats(p_user_id UUID, p_course_id TEXT)`                | `JSONB`    | DEFINER   | Returns `{completedModules, totalModules, overallPercent, totalWatchTime, currentModule}` for a user's enrollment. |
| 9 | `get_course_analytics(p_course_id TEXT)`                              | `JSON`     | DEFINER   | Returns `{totalEnrollments, completionRate, avgWatchTimeMinutes, revenueTotal, activeStudents30d}`. |

### Trigger Functions

| #  | Function               | Returns   | Security  | Description                                              |
|----|------------------------|-----------|-----------|----------------------------------------------------------|
| 10 | `update_course_rating()` | `TRIGGER` | --        | Recalculates `courses.rating` as AVG of all reviews and updates `total_students` count. Fired on review INSERT/UPDATE/DELETE. |
| 11 | `handle_new_user()`      | `TRIGGER` | DEFINER   | Creates a `users` row from `auth.users` metadata (name, email, avatar, google_id). Uses ON CONFLICT to handle re-signups. |
| 12 | `handle_user_login()`    | `TRIGGER` | DEFINER   | Updates `users.last_login_at` to `now()`. Defined but not attached as a trigger (called from frontend after auth state change). |

### Scheduled Functions

| #  | Function                | Returns   | Security  | Description                                              |
|----|-------------------------|-----------|-----------|----------------------------------------------------------|
| 13 | `expire_enrollments()`  | `INTEGER` | DEFINER   | Sets `status = 'EXPIRED'` on active enrollments past their `expires_at` date. Returns count of expired rows. Scheduled via pg_cron. |

### Utility Functions

| #  | Function                                                                          | Returns | Security  | Description                                              |
|----|-----------------------------------------------------------------------------------|---------|-----------|----------------------------------------------------------|
| 14 | `increment_view_count(p_user_id UUID, p_course_id TEXT, p_module_id TEXT, p_timestamp NUMERIC DEFAULT 0)` | `void` | DEFINER | Atomically increments `progress.view_count` by 1 and updates the playback timestamp. |

---

## Triggers

11 triggers across the schema.

### `update_updated_at` Triggers (8)

Automatically set `updated_at = now()` before any UPDATE on the row.

| Trigger Name                  | Table          | Timing         | Event  |
|-------------------------------|----------------|----------------|--------|
| `users_updated_at`            | `users`        | BEFORE UPDATE  | UPDATE |
| `courses_updated_at`          | `courses`      | BEFORE UPDATE  | UPDATE |
| `modules_updated_at`          | `modules`      | BEFORE UPDATE  | UPDATE |
| `enrollments_updated_at`      | `enrollments`  | BEFORE UPDATE  | UPDATE |
| `progress_updated_at`         | `progress`     | BEFORE UPDATE  | UPDATE |
| `certificates_updated_at`     | `certificates` | BEFORE UPDATE  | UPDATE |
| `reviews_updated_at`          | `reviews`      | BEFORE UPDATE  | UPDATE |
| `set_site_content_updated_at` | `site_content` | BEFORE UPDATE  | UPDATE |

Note: `set_payments_updated_at` on `payments` also uses the same `update_updated_at()` function (added in migration 006).

### Business Logic Triggers (2)

| Trigger Name               | Table          | Timing        | Event                      | Function                |
|----------------------------|----------------|---------------|----------------------------|-------------------------|
| `reviews_update_rating`    | `reviews`      | AFTER         | INSERT, UPDATE, DELETE     | `update_course_rating()`|
| `on_auth_user_created`     | `auth.users`   | AFTER         | INSERT                     | `handle_new_user()`     |

### Updated-at Trigger for Payments (1)

| Trigger Name                | Table       | Timing        | Event  | Function              |
|-----------------------------|-------------|---------------|--------|-----------------------|
| `set_payments_updated_at`   | `payments`  | BEFORE UPDATE | UPDATE | `update_updated_at()` |

---

## Indexes

All indexes defined across the schema for query performance.

| Index Name                           | Table            | Column(s)                       | Type          |
|--------------------------------------|------------------|---------------------------------|---------------|
| `idx_users_email`                    | `users`          | `email`                         | B-tree        |
| `idx_courses_slug`                   | `courses`        | `slug`                          | B-tree        |
| `idx_courses_status`                 | `courses`        | `status`                        | B-tree        |
| `idx_modules_course_id`             | `modules`        | `course_id`                     | B-tree        |
| `idx_modules_order`                 | `modules`        | `(course_id, order_index)`      | B-tree        |
| `idx_enrollments_user`              | `enrollments`    | `user_id`                       | B-tree        |
| `idx_enrollments_course`            | `enrollments`    | `course_id`                     | B-tree        |
| `idx_enrollments_status`            | `enrollments`    | `status`                        | B-tree        |
| `idx_progress_user`                 | `progress`       | `user_id`                       | B-tree        |
| `idx_progress_module`               | `progress`       | `module_id`                     | B-tree        |
| `idx_progress_user_course`          | `progress`       | `(user_id, course_id)`          | B-tree        |
| `idx_progress_course_id`            | `progress`       | `course_id`                     | B-tree        |
| `idx_certificates_user`             | `certificates`   | `user_id`                       | B-tree        |
| `idx_certificates_number`           | `certificates`   | `certificate_number`            | B-tree        |
| `idx_reviews_course`                | `reviews`        | `course_id`                     | B-tree        |
| `idx_login_attempts_user`           | `login_attempts` | `user_id`                       | B-tree        |
| `idx_login_attempts_email`          | `login_attempts` | `email`                         | B-tree        |
| `idx_login_attempts_ip`             | `login_attempts` | `ip_address`                    | B-tree        |
| `idx_notifications_user`            | `notifications`  | `user_id`                       | B-tree        |
| `idx_notifications_read`            | `notifications`  | `(user_id, read)`               | B-tree        |
| `idx_notifications_created_at`      | `notifications`  | `(user_id, created_at DESC)`    | B-tree        |
| `idx_payments_user_id`              | `payments`       | `user_id`                       | B-tree        |
| `idx_payments_course_id`            | `payments`       | `course_id`                     | B-tree        |
| `idx_payments_status`               | `payments`       | `status`                        | B-tree        |
| `idx_payments_razorpay_order`       | `payments`       | `razorpay_order_id`             | B-tree        |
| `idx_payments_razorpay_payment_id`  | `payments`       | `razorpay_payment_id`           | Unique partial (WHERE NOT NULL) |
| `idx_site_content_section`          | `site_content`   | `(section, order_index)`        | B-tree        |
| `idx_bundle_courses_bundle`         | `bundle_courses` | `bundle_id`                     | B-tree        |
| `idx_bundle_courses_course`         | `bundle_courses` | `course_id`                     | B-tree        |

---

## Scheduled Jobs

| Job Name                     | Schedule        | Cron Expression | Function              | Description                                   |
|------------------------------|-----------------|-----------------|-----------------------|-----------------------------------------------|
| `expire-enrollments-daily`   | Daily at 2 AM UTC | `0 2 * * *`    | `expire_enrollments()`| Auto-expires active enrollments past their `expires_at` date. Requires `pg_cron` extension (Supabase Pro+). |

---

## Storage Buckets

| Bucket ID      | Public | File Size Limit | Allowed MIME Types  | Access Pattern                                   |
|----------------|--------|-----------------|---------------------|--------------------------------------------------|
| `certificates` | No     | 5 MB            | `application/pdf`   | Upload: service_role (Edge Functions). Download: authenticated user, own folder only (`uid/filename.pdf`). |

### Storage Policies

- **cert_download** (SELECT): User can download files where the first folder in the path matches their `auth.uid()`.
- **cert_upload** (INSERT): Service role can upload any file to the bucket (Edge Functions bypass RLS with service_role key).
- **cert_delete** (DELETE): Service role can delete any file in the bucket.

---

## Migration History

| #   | File Name                          | Purpose                                                                                         |
|-----|------------------------------------|-------------------------------------------------------------------------------------------------|
| 001 | `001_initial_schema.sql`           | Core schema: 6 enums, 11 tables (users, courses, modules, enrollments, progress, certificates, reviews, sessions, refresh_tokens, login_attempts, notifications), indexes, `update_updated_at()` trigger function, 7 updated_at triggers. |
| 002 | `002_functions.sql`                | Business logic RPCs: `complete_module()`, `get_admin_stats()`, `get_sales_data()`, `get_recent_activity()`, `update_course_rating()` trigger, `reviews_update_rating` trigger, `get_progress_stats()`. |
| 003 | `003_rls_policies.sql`             | RLS enabled on all 11 tables. `is_admin()` helper function. 33 initial policies covering SELECT/INSERT/UPDATE/DELETE per table. |
| 004 | `004_auth_trigger.sql`             | `handle_new_user()` trigger function. `on_auth_user_created` trigger on `auth.users`. `handle_user_login()` function (not trigger-attached). |
| 005 | `005_storage.sql`                  | `certificates` storage bucket (private, 5MB, PDF only). 3 storage policies (download, upload, delete). |
| 006 | `006_production_gaps.sql`          | `site_content` table with seed data. `payments` table with indexes. `courses.deleted_at` soft-delete column. Updated `courses_select` policy for soft-delete. `get_course_analytics()` RPC. `generate_receipt_number()` function. |
| 007 | `007_bundle_courses.sql`           | `bundle_courses` join table with composite PK, self-reference check constraint, indexes, RLS policies. |
| 008 | `008_schema_fixes.sql`             | Type fixes on `payments` FKs. `progress.course_id` FK added. 7 CHECK constraints. Tightened `users_select`, `login_attempts_insert`, `certificates_select` policies. `complete_module()` rewritten with module-course validation. |
| 009 | `009_review_fixes.sql`             | Unique partial index on `razorpay_payment_id`. `complete_module()` rewritten with `FOR UPDATE` row locking. Notifications created_at index. Dropped `sessions` and `refresh_tokens` tables. |
| 010 | `010_enrollment_expiration.sql`    | `pg_cron` extension. `expire_enrollments()` function. Scheduled job `expire-enrollments-daily` at 2 AM UTC. |
| 011 | `011_increment_view_count.sql`     | `increment_view_count()` RPC for atomic view count and timestamp updates. |
| 012 | `012_set_bunny_video_urls.sql`     | Data migration: replaces placeholder videvo.net URLs with real Bunny.net Stream HLS URLs on existing module rows. |

---

## Notes for Developers

- **Currency:** All monetary values (`price`, `amount`, `refund_amount`) are stored as integers in **paise** (1/100 of INR). Divide by 100 for display.
- **Soft delete:** Courses use `deleted_at` rather than physical deletion. The `courses_select` RLS policy filters soft-deleted rows from non-admin users automatically.
- **Denormalization:** `enrollments.completed_modules`, `enrollments.overall_percent`, and `enrollments.total_watch_time` are denormalized fields kept in sync by `complete_module()`. Do not update these directly.
- **Service role bypass:** Edge Functions using `service_role` key bypass all RLS policies. This is intentional for operations like payment verification, certificate generation, and notification creation.
- **Auth flow:** When a user signs up via Supabase Auth (Google OAuth), the `on_auth_user_created` trigger fires `handle_new_user()`, which creates the corresponding `users` row with metadata extracted from the OAuth provider.
- **Next migration number:** 013.
