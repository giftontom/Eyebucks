# Edge Functions API Reference

## Overview

All Edge Functions are deployed as Supabase Edge Functions (Deno runtime) at:

```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

Every function (except `checkout-webhook`) requires a valid Supabase JWT in the `Authorization: Bearer <token>` header. All functions accept only `POST` requests and handle `OPTIONS` preflight for CORS.

**Base URL (production):** `https://pdengtcdtszpvwhedzxn.supabase.co/functions/v1/`

---

## Table of Contents

- [Shared Utilities (`_shared/`)](#shared-utilities-_shared)
  - [cors.ts](#1-corsts)
  - [auth.ts](#2-authts)
  - [response.ts](#3-responsets)
  - [hmac.ts](#4-hmacts)
  - [certificates.ts](#5-certificatests)
  - [email.ts](#6-emailts)
  - [supabaseAdmin.ts](#7-supabaseadmints)
- [Edge Functions](#edge-functions)
  - [checkout-create-order](#1-checkout-create-order)
  - [checkout-verify](#2-checkout-verify)
  - [checkout-webhook](#3-checkout-webhook)
  - [video-signed-url](#4-video-signed-url)
  - [admin-video-upload](#5-admin-video-upload)
  - [certificate-generate](#6-certificate-generate)
  - [progress-complete](#7-progress-complete)
  - [refund-process](#8-refund-process)
  - [session-enforce](#9-session-enforce)

---

## Shared Utilities (`_shared/`)

Located at `supabase/functions/_shared/`. These modules are imported by Edge Functions using relative paths (`../_shared/<module>.ts`).

### 1. `cors.ts`

Origin-specific CORS header generator. Returns the requesting origin if it is on the allowlist; otherwise falls back to the production origin.

```typescript
getCorsHeaders(req: Request): Record<string, string>
```

**Allowed origins:**

| Origin | Environment |
|--------|-------------|
| `https://eyebuckz.com` | Production |
| `https://www.eyebuckz.com` | Production (www) |
| `https://dev.eyebuckz.com` | Staging |
| `http://localhost:3000` | Local dev (Vite default) |
| `http://localhost:5173` | Local dev (Vite alt) |
| `https://*.eyebucks.pages.dev` | Cloudflare Pages preview |
| `https://*.eyebucks-dev.pages.dev` | Cloudflare Pages dev preview |

**Returned headers:**

| Header | Value |
|--------|-------|
| `Access-Control-Allow-Origin` | Matched origin or `https://eyebuckz.com` |
| `Access-Control-Allow-Headers` | `authorization, x-client-info, apikey, content-type` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Vary` | `Origin` |

---

### 2. `auth.ts`

JWT verification and admin role checking.

#### `verifyAuth(req, corsHeaders)`

```typescript
verifyAuth(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AuthSuccess | AuthFailure>
```

Extracts the `Authorization` header, creates a per-request Supabase client scoped to that token, and calls `auth.getUser()` to validate the JWT.

**Return types:**

| Type | Shape | When |
|------|-------|------|
| `AuthSuccess` | `{ user: { id: string; email?: string } }` | Valid JWT |
| `AuthFailure` | `{ errorResponse: Response }` | Missing or invalid JWT (401) |

**Usage pattern:**

```typescript
const auth = await verifyAuth(req, corsHeaders);
if ('errorResponse' in auth) return auth.errorResponse;
const { user } = auth;
```

#### `verifyAdmin(userId, adminClient?)`

```typescript
verifyAdmin(
  userId: string,
  adminClient?: SupabaseClient
): Promise<boolean>
```

Queries the `users` table for the given `userId` and returns `true` if `role === 'ADMIN'`. Accepts an optional pre-built admin client; creates one internally if not provided.

---

### 3. `response.ts`

Standardized JSON response constructors.

#### `jsonResponse(data, corsHeaders, status?)`

```typescript
jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response
```

Returns a `Response` with `Content-Type: application/json`, the provided CORS headers, and `JSON.stringify(data)` as the body.

#### `errorResponse(error, corsHeaders, status?)`

```typescript
errorResponse(
  error: string,
  corsHeaders: Record<string, string>,
  status: number = 400
): Response
```

Returns a `Response` with body `{ success: false, error: "<message>" }` and the specified HTTP status.

---

### 4. `hmac.ts`

Cryptographic utilities for payment signature verification.

#### `hmacSha256(message, secret)`

```typescript
hmacSha256(message: string, secret: string): Promise<string>
```

Generates an HMAC-SHA256 signature using the Web Crypto API. Returns a lowercase hex string.

Used by `checkout-verify` (Razorpay payment signature: `orderId|paymentId`) and `checkout-webhook` (Razorpay webhook body signature).

#### `timingSafeEqual(a, b)`

```typescript
timingSafeEqual(a: string, b: string): boolean
```

Constant-time string comparison to prevent timing attacks. Returns `false` immediately if lengths differ; otherwise XORs each byte and checks for zero result.

---

### 5. `certificates.ts`

Certificate number generation.

#### `generateCertificateNumber()`

```typescript
generateCertificateNumber(): string
```

Generates a unique certificate number with the format:

```
EYEBUCKZ-{timestamp_base36}-{random_hex}
```

- `timestamp_base36`: `Date.now()` encoded as uppercase base-36
- `random_hex`: 6 random bytes (12 uppercase hex characters) via `crypto.getRandomValues()`

Example: `EYEBUCKZ-LK8F3P2Q-4A7B9C1D2E3F`

---

### 6. `email.ts`

Fire-and-forget email sending via the Resend API.

#### `sendEmail(to, subject, html)`

```typescript
sendEmail(to: string, subject: string, html: string): void
```

Sends an HTML email asynchronously. Does **not** return a Promise or block the caller. Silently no-ops if `RESEND_API_KEY` is not set or `to` is falsy.

**Retry behavior:**

| Attempt | Backoff |
|---------|---------|
| 1 | Immediate |
| 2 | 1,000 ms |
| 3 | 2,000 ms |

- 4xx errors (except 429 rate limit) are **not retried** (logged and abandoned).
- 5xx errors and 429 are retried with exponential backoff.
- After all 3 attempts fail, logs `[Email] All 3 attempts failed for <to>`.

**Environment variables:**

| Variable | Required | Default |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes (silent no-op if missing) | -- |
| `RESEND_FROM_EMAIL` | No | `noreply@eyebuckz.com` |

---

### 7. `supabaseAdmin.ts`

Service-role Supabase client factory.

#### `createAdminClient()`

```typescript
createAdminClient(): SupabaseClient
```

Creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses all RLS policies**. Used by every Edge Function for privileged database operations (creating enrollments, updating payments, etc.).

**Environment variables:**

| Variable | Required |
|----------|----------|
| `SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |

---

## Edge Functions

### 1. `checkout-create-order`

Creates a Razorpay order for a published, paid course.

**Source:** `supabase/functions/checkout-create-order/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/checkout-create-order` |
| **Auth** | JWT required |
| **External APIs** | Razorpay Orders API |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseId` | `string` | Yes | UUID of the course to purchase |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `orderId` | `string` | Razorpay order ID (e.g., `order_abc123`) |
| `amount` | `number` | Amount in paise (e.g., `49900` = INR 499) |
| `currency` | `string` | Always `"INR"` |
| `key` | `string` | Razorpay public key ID (for client SDK) |
| `courseTitle` | `string` | Course title for display |

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `courseId is required` | Missing `courseId` in request body |
| 400 | `This course is free -- no payment required` | Course price is 0 or negative |
| 404 | `Course not found` | Course does not exist or is not `PUBLISHED` |
| 409 | `Already enrolled in this course` | User has an `ACTIVE` enrollment |
| 500 | `Failed to create payment order` | Razorpay API returned an error |

#### Flow

1. Verify JWT authentication
2. Fetch course (must be `PUBLISHED`)
3. Reject if `price <= 0` (free courses)
4. Check for existing `ACTIVE` enrollment
5. Create Razorpay order with `amount` in paise, `currency: "INR"`, and `notes` containing `courseId`, `userId`, `courseTitle`
6. Return order details and Razorpay public key

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |

---

### 2. `checkout-verify`

Verifies a Razorpay payment signature, creates enrollment and payment records, and sends confirmation emails.

**Source:** `supabase/functions/checkout-verify/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/checkout-verify` |
| **Auth** | JWT required |
| **External APIs** | Razorpay Orders API (amount verification), Resend (2 emails) |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | `string` | Yes | Razorpay order ID |
| `paymentId` | `string` | Yes | Razorpay payment ID |
| `signature` | `string` | Yes | HMAC-SHA256 signature from Razorpay client SDK |
| `courseId` | `string` | Yes | UUID of the purchased course |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `verified` | `boolean` | Always `true` |
| `enrollmentId` | `string` | UUID of the created enrollment |
| `bundleWarning` | `string?` | Present if some bundle courses failed enrollment |
| `failedCourseIds` | `string[]?` | UUIDs of bundle courses that failed enrollment |

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `Missing required fields (...)` | Any of the 4 fields missing |
| 400 | `Invalid payment signature` | HMAC verification failed |
| 400 | `Payment amount mismatch` | Razorpay order amount differs from course price |
| 404 | `Course not found` | Course does not exist |
| 409 | `Already enrolled` | Duplicate enrollment (unique constraint violation) |
| 500 | `Payment verification not configured` | `RAZORPAY_KEY_SECRET` not set |

#### Security

- **Signature verification:** Computes `HMAC-SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET)` and compares using `timingSafeEqual()` to prevent timing attacks.
- **Amount verification (defense-in-depth):** Fetches the Razorpay order via API and confirms `order.amount === course.price`.

#### Side Effects

1. **Enrollment created** with status `ACTIVE`, linked to `paymentId` and `orderId`
2. **Bundle expansion:** If `course.type === 'BUNDLE'`, creates additional enrollments for all courses in `bundle_courses` table (amount `0`, upsert with `ignoreDuplicates`)
3. **Payment record** inserted with status `captured` and auto-generated receipt number (`EYB-{base36_timestamp}`)
4. **Notification** created (type `enrollment`)
5. **Enrollment welcome email** sent via Resend (non-blocking)
6. **Payment receipt email** sent via Resend (non-blocking, formatted in INR)

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `APP_URL` | Base URL for email links (default: `https://eyebuckz.com`) |
| `RESEND_API_KEY` | Resend API key for emails |
| `RESEND_FROM_EMAIL` | Sender address (default: `noreply@eyebuckz.com`) |

---

### 3. `checkout-webhook`

Handles asynchronous Razorpay webhook events. Acts as a safety net for payment processing -- if `checkout-verify` fails, this webhook ensures enrollment is still created.

**Source:** `supabase/functions/checkout-webhook/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/checkout-webhook` |
| **Auth** | None (`verify_jwt = false`) |
| **External APIs** | None (receives calls from Razorpay) |

#### Request

Razorpay sends a JSON payload with an `x-razorpay-signature` header. The body is read as raw text for signature verification before JSON parsing.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `x-razorpay-signature` | Yes | HMAC-SHA256 of raw body using webhook secret |

**Body structure:**

```json
{
  "event": "payment.captured" | "payment.failed",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 49900,
        "currency": "INR",
        "method": "upi",
        "notes": {
          "courseId": "uuid",
          "userId": "uuid"
        }
      }
    }
  }
}
```

#### Response (200)

```json
{ "status": "ok" }
```

Always returns 200 for valid, verified requests (even if the event type is unhandled) to prevent Razorpay from retrying.

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 401 | `Missing signature` | No `x-razorpay-signature` header |
| 400 | `Invalid signature` | HMAC verification failed |
| 405 | `Method not allowed` | Non-POST request |
| 500 | `Internal server error` | Unhandled exception |
| 500 | (logged) | `RAZORPAY_WEBHOOK_SECRET` not configured |

#### Handled Events

**`payment.captured`:**

1. Extract `courseId` and `userId` from `payment.notes`
2. Check for existing enrollment (idempotency guard)
3. If no enrollment exists: create enrollment, payment record (with `receipt_number`, `method`), and notification

**`payment.failed`:**

1. Extract `userId` from `payment.notes`
2. Insert payment record with `status: 'failed'`
3. Create failure notification for the user

#### CORS

This function does **not** use CORS headers since it is called server-to-server by Razorpay, not from a browser.

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret (different from API secret) |

---

### 4. `video-signed-url`

Generates time-limited, token-authenticated Bunny.net CDN URLs for HLS video streaming.

**Source:** `supabase/functions/video-signed-url/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/video-signed-url` |
| **Auth** | JWT required |
| **External APIs** | None (URL signing is computed locally) |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoId` | `string` | Yes | Bunny.net video GUID |
| `moduleId` | `string` | Conditional | Module UUID. Required for non-admin users. |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `signedUrl` | `string` | Full signed HLS URL with token and expiry |
| `hlsUrl` | `string` | Same as `signedUrl` |
| `expiresAt` | `number` | Unix timestamp (seconds) when the URL expires |

**Signed URL format:**

```
https://<cdn_hostname>/<videoId>/playlist.m3u8?token=<base64url>&expires=<unix_seconds>
```

#### Access Control Matrix

| User Role | `moduleId` Provided | Behavior |
|-----------|---------------------|----------|
| Admin | No | Allowed (any video) |
| Admin | Yes | Allowed (with module validation) |
| Regular user | No | **Rejected** (400) |
| Regular user | Yes, free preview | Allowed (no enrollment check) |
| Regular user | Yes, paid module | Must have `ACTIVE` enrollment in the module's course |

#### Token Generation

```
token = SHA256(tokenKey + "/" + videoId + "/playlist.m3u8" + expires)
      -> base64url encoded (no padding)
```

Token expiry: **1 hour** (3600 seconds).

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `videoId is required` | Missing `videoId` |
| 400 | `moduleId is required` | Non-admin user without `moduleId` |
| 403 | `Video does not belong to this module` | `videoId` not found in `module.video_url` |
| 403 | `Not enrolled in this course` | No `ACTIVE` enrollment for the module's course |
| 404 | `Module not found` | `moduleId` does not exist |
| 500 | `Video streaming not configured` | `BUNNY_STREAM_CDN_HOSTNAME` not set |
| 500 | `Video streaming token not configured` | `BUNNY_STREAM_TOKEN_KEY` not set |

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `BUNNY_STREAM_CDN_HOSTNAME` | Bunny CDN hostname (e.g., `vz-abc123-456.b-cdn.net`) |
| `BUNNY_STREAM_TOKEN_KEY` | Bunny token authentication key |

---

### 5. `admin-video-upload`

Creates a Bunny.net video entry and returns TUS upload credentials for direct client-side upload.

**Source:** `supabase/functions/admin-video-upload/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/admin-video-upload` |
| **Auth** | JWT + Admin role required |
| **External APIs** | Bunny.net Stream API (create video) |

#### Two-Phase Upload Architecture

This function implements phase 1 of a two-phase upload to avoid Supabase Edge Function body size limits:

1. **Phase 1 (this Edge Function):** Authenticate admin, create video entry in Bunny, return TUS credentials
2. **Phase 2 (client-side):** Frontend uses [tus-js-client](https://github.com/tus/tus-js-client) to upload directly to `https://video.bunnycdn.com/tusupload`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Video title (passed to Bunny) |
| `fileSizeBytes` | `number` | No | File size for pre-validation |
| `mimeType` | `string` | No | MIME type for pre-validation (must start with `video/`) |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `video.videoId` | `string` | Bunny video GUID |
| `video.libraryId` | `string` | Bunny stream library ID |
| `video.tusEndpoint` | `string` | Always `"https://video.bunnycdn.com/tusupload"` |
| `video.authSignature` | `string` | SHA256 TUS auth signature (hex) |
| `video.authExpire` | `number` | Signature expiry (Unix seconds, 2 hours) |
| `video.hlsUrl` | `string` | HLS playback URL (available after transcoding) |
| `video.thumbnailUrl` | `string` | Thumbnail URL (available after transcoding) |

#### TUS Authentication Signature

```
signature = SHA256(libraryId + apiKey + authExpire + videoGuid)
          -> lowercase hex string
```

The client must send these TUS headers during upload:

```
AuthorizationSignature: <authSignature>
AuthorizationExpire: <authExpire>
VideoId: <videoId>
LibraryId: <libraryId>
```

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `Title is required` | Missing `title` |
| 400 | `Invalid file size` | `fileSizeBytes` is not a positive number |
| 403 | `Admin access required` | Authenticated user is not an admin |
| 413 | `File too large. Maximum size is 5 GB.` | `fileSizeBytes` exceeds 5,368,709,120 bytes |
| 415 | `Invalid file type. Only video files are allowed.` | `mimeType` does not start with `video/` |
| 500 | `Video service not configured` | Missing Bunny environment variables |
| 500 | `Failed to create video entry: <details>` | Bunny API returned an error |

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key |
| `BUNNY_STREAM_LIBRARY_ID` | Bunny Stream library ID |
| `BUNNY_STREAM_CDN_HOSTNAME` | CDN hostname for constructing playback URLs |

---

### 6. `certificate-generate`

Generates a certificate record for a completed course and sends a congratulations email.

**Source:** `supabase/functions/certificate-generate/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/certificate-generate` |
| **Auth** | JWT required (admin or self) |
| **External APIs** | Resend (congratulations email) |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseId` | `string` | Yes | UUID of the completed course |
| `userId` | `string` | No | Target user UUID. Defaults to the authenticated user. Only admins may specify a different user. |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `certificate.id` | `string` | Certificate record UUID |
| `certificate.certificateNumber` | `string` | Unique certificate number |
| `certificate.studentName` | `string` | Student name at time of issuance |
| `certificate.courseTitle` | `string` | Course title at time of issuance |
| `certificate.issueDate` | `string` | ISO 8601 timestamp |
| `certificate.completionDate` | `string` | ISO 8601 timestamp |
| `certificate.status` | `string` | Always `"ACTIVE"` |

#### Authorization

| Caller | Target | Allowed |
|--------|--------|---------|
| Regular user | Self (`userId` omitted or matches caller) | Yes |
| Regular user | Another user | No (403) |
| Admin | Any user | Yes |

#### Completion Requirement

- Regular users: `enrollment.overall_percent` must be `100`. Returns a descriptive error with current percentage if not met.
- Admins: Completion check is bypassed (can issue certificates for any enrollment).

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 403 | `Forbidden` | Non-admin trying to generate for another user |
| 404 | `User or course not found` | Invalid `userId` or `courseId` |
| 400 | `No active enrollment found` | No `ACTIVE` enrollment for user+course |
| 400 | `Course not yet completed (X% done)...` | Completion under 100% (non-admin) |
| 409 | `Certificate already exists` | Duplicate. Returns existing `certificate` in response. |
| 500 | `Failed to create certificate` | Database insert error |

#### Side Effects

1. **Certificate record** inserted with generated `certificate_number`, `student_name`, `course_title`, `status: 'ACTIVE'`
2. **Notification** created (type `certificate`)
3. **Congratulations email** sent via Resend with certificate number and dashboard link (non-blocking)

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_URL` | Base URL for email links (default: `https://eyebuckz.com`) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender address (default: `noreply@eyebuckz.com`) |

---

### 7. `progress-complete`

Marks a module as completed, updates course progress, and triggers auto-certification at 100%.

**Source:** `supabase/functions/progress-complete/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/progress-complete` |
| **Auth** | JWT required |
| **External APIs** | None |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `moduleId` | `string` | Yes | UUID of the module to complete |
| `courseId` | `string` | Yes | UUID of the course |
| `currentTime` | `number` | No | Current playback position in seconds |
| `duration` | `number` | No | Total video duration in seconds |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `progress` | `object?` | Full progress record from `progress` table |
| `stats.completedModules` | `number` | Number of completed modules |
| `stats.totalModules` | `number` | Total modules in the course |
| `stats.overallPercent` | `number` | Completion percentage (0-100) |

#### Watch Threshold Validation

If both `currentTime` and `duration` are provided, the function enforces a **95% watch threshold**:

```
currentTime / duration >= 0.95
```

If this check fails, the request is rejected with a 400 error. If `currentTime` or `duration` is omitted, the threshold check is skipped (allows manual completion by non-video modules).

#### Database RPC

Calls the `complete_module()` PostgreSQL function atomically:

```sql
SELECT * FROM complete_module(p_user_id, p_module_id, p_course_id);
```

This function uses row-level locking to prevent race conditions when completing modules concurrently. It returns:

| Field | Type | Description |
|-------|------|-------------|
| `completed_count` | `integer` | Modules completed after this operation |
| `total_modules` | `integer` | Total modules in the course |
| `percent` | `numeric` | Completion percentage |

#### Side Effects

**At 100% completion (auto-certificate):**

1. Checks for existing certificate (prevents duplicates)
2. Creates certificate record with generated number
3. Creates notification (type `certificate`, title `"Course Completed!"`)

**At milestone thresholds (25%, 50%, 75%):**

Creates a milestone notification. Only one notification per milestone crossing (checks if percentage falls within the range `[milestone, milestone + (100 / totalModules))`).

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `moduleId and courseId are required` | Missing required fields |
| 400 | `Must watch at least 95% of the video` | Watch threshold not met |
| 500 | `Failed to complete module` | `complete_module()` RPC error |

---

### 8. `refund-process`

Processes a full refund through the Razorpay API, updates the payment record, revokes enrollment, and notifies the user.

**Source:** `supabase/functions/refund-process/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/refund-process` |
| **Auth** | JWT + Admin role required |
| **External APIs** | Razorpay Refund API |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentId` | `string` | Yes | UUID of the payment record (internal DB ID, not Razorpay ID) |
| `reason` | `string` | Yes | Admin-provided refund reason |

#### Response (200)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` |
| `refundId` | `string` | Razorpay refund ID |
| `amount` | `number` | Refunded amount in paise |
| `status` | `string` | Razorpay refund status |

#### State Machine

Only the `captured` -> `refunded` transition is valid:

```
captured  -->  refunded     (allowed)
failed    -->  refunded     (rejected: 400)
refunded  -->  refunded     (rejected: 409)
```

#### Processing Flow

1. Verify JWT + admin role
2. Fetch payment record by `paymentId`
3. Validate state: must be `captured`, must have `razorpay_payment_id`
4. Call Razorpay Refund API: `POST /v1/payments/{razorpay_payment_id}/refund` with full `amount` and `notes` (reason + admin user ID)
5. Update payment record: `status = 'refunded'`, `refund_id`, `refund_amount`, `refund_reason`, `refunded_at`
6. If Razorpay succeeds but DB update fails: return 500 with Razorpay refund ID for manual reconciliation
7. Revoke enrollment: set `status = 'REVOKED'` on linked enrollment
8. Create notification (type `announcement`, includes formatted INR amount and 5-7 business day timeline)

#### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `paymentId and reason are required` | Missing required fields |
| 400 | `Only captured payments can be refunded` | Payment status is not `captured` |
| 400 | `No Razorpay payment ID -- cannot process refund` | Payment has no `razorpay_payment_id` |
| 403 | `Admin access required` | Authenticated user is not an admin |
| 404 | `Payment not found` | No payment with given `paymentId` |
| 409 | `Payment already refunded` | Payment status is `refunded` |
| 500 | `Razorpay credentials not configured` | Missing `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` |
| 500 | `Refund processed at Razorpay but DB update failed...` | Razorpay succeeded but local DB update failed |
| 502 | Razorpay error description or `Razorpay refund failed` | Razorpay API returned an error |

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |

---

## Environment Variables Summary

### Required by all functions

| Variable | Source | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | Auto-injected | Supabase project URL |
| `SUPABASE_ANON_KEY` | Auto-injected | Supabase anonymous key (for JWT verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Service role key (bypasses RLS) |

### Set via `supabase secrets set`

| Variable | Used By | Description |
|----------|---------|-------------|
| `RAZORPAY_KEY_ID` | checkout-create-order, checkout-verify, refund-process | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | checkout-create-order, checkout-verify, refund-process | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | checkout-webhook | Razorpay webhook signing secret |
| `BUNNY_STREAM_API_KEY` | admin-video-upload | Bunny Stream API key |
| `BUNNY_STREAM_LIBRARY_ID` | admin-video-upload | Bunny Stream library ID |
| `BUNNY_STREAM_CDN_HOSTNAME` | video-signed-url, admin-video-upload | Bunny CDN hostname |
| `BUNNY_STREAM_TOKEN_KEY` | video-signed-url | Bunny token authentication key |
| `RESEND_API_KEY` | checkout-verify, certificate-generate | Resend email API key |
| `RESEND_FROM_EMAIL` | checkout-verify, certificate-generate | Sender email address |
| `APP_URL` | checkout-verify, certificate-generate | Base URL for email links |

---

### 9. `session-enforce`

Verifies and enforces user session state. Used for server-side session invalidation and admin-controlled session management.

**Source:** `supabase/functions/session-enforce/index.ts`

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /functions/v1/session-enforce` |
| **Auth** | JWT + Admin role required |
| **External APIs** | None |

**Deployment note:** Deployed with `--no-verify-jwt` flag (ES256 JWT migration compatibility). JWT verification is performed manually inside the function via `verifyAuth()`.

---

## Common Patterns

### CORS Preflight

Every JWT-authenticated function handles `OPTIONS` preflight:

```typescript
const corsHeaders = getCorsHeaders(req);
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### Authentication Guard

```typescript
const auth = await verifyAuth(req, corsHeaders);
if ('errorResponse' in auth) return auth.errorResponse;
const { user } = auth;
```

### Admin Guard

```typescript
const adminClient = createAdminClient();
const isAdmin = await verifyAdmin(user.id, adminClient);
if (!isAdmin) {
  return errorResponse('Admin access required', corsHeaders, 403);
}
```

### Error Logging Convention

All functions log errors with a prefix tag:

```typescript
console.error('[FunctionName] Context:', error);
```

Examples: `[Checkout]`, `[Webhook]`, `[Video]`, `[Video Upload]`, `[Certificate]`, `[Progress Complete]`, `[Refund]`, `[Refund Process]`, `[Email]`.
