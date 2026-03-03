# Eyebuckz LMS - User Flow Documentation

> **Last Updated:** March 3, 2026
> **Architecture:** Supabase (Auth, PostgreSQL + RLS, Edge Functions) + React 19 + Vite 6
> **Routing:** HashRouter (`/#/path`)

## Table of Contents

1. [Flow 1: Registration & Authentication](#flow-1-registration--authentication)
2. [Flow 2: Course Discovery](#flow-2-course-discovery)
3. [Flow 3: Purchase Flow](#flow-3-purchase-flow)
4. [Flow 4: Learning Flow](#flow-4-learning-flow)
5. [Flow 5: Progress Tracking](#flow-5-progress-tracking)
6. [Flow 6: Certificate Generation](#flow-6-certificate-generation)
7. [Flow 7: Profile Management](#flow-7-profile-management)
8. [Flow 8: Admin Workflows](#flow-8-admin-workflows)
9. [Route Map](#route-map)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Flow 1: Registration & Authentication

### Overview

| Field | Value |
|-------|-------|
| **Auth Provider** | Supabase Auth with Google OAuth |
| **Session Storage** | Supabase manages JWT tokens (not localStorage) |
| **Profile Creation** | Automatic via PostgreSQL auth trigger on `auth.users` insert |
| **Route Guard** | `ProtectedRoute` component redirects to `/login` with `returnTo` state |

### Flow Diagram

```
User clicks "Start Learning" or accesses protected route
    |
    v
ProtectedRoute checks auth state via useAuth()
    |
    +--[isLoading]---> Show spinner ("Checking authentication...")
    |
    +--[no user]-----> Redirect to /login (state: { returnTo: original_path })
    |
    v
Login Page (/login)
    |
    +--[Google OAuth]--> supabase.auth.signInWithOAuth({ provider: 'google' })
    |                        |
    |                        v
    |                    Google Consent Screen (external)
    |                        |
    |                        v
    |                    Redirect back to window.location.origin
    |                        |
    |                        v
    |                    index.tsx intercepts OAuth callback (URL hash tokens)
    |                        |
    |                        v
    |                    supabase.auth.getSession() picks up new session
    |                        |
    |                        v
    |                    onAuthStateChange fires 'SIGNED_IN' event
    |                        |
    |                        v
    |                    Auth trigger creates user profile in public.users table
    |                        |
    |                        v
    |                    retryLoadProfile() with exponential backoff
    |                    (200ms, 400ms, 800ms, 1600ms, 3000ms retries)
    |                        |
    |                        v
    |                    Profile loaded -> user state set -> redirect to returnTo
    |
    +--[Dev Mode]----> supabase.auth.signInWithPassword() (test@example.com)
                           |
                           v
                       Same profile load flow as above
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `AuthProvider` | `context/AuthContext.tsx` | Manages session, user state, auth methods |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Route guard with redirect |
| `Login` | `pages/Login.tsx` | Login page with Google OAuth + dev fallback |
| `Layout` | `components/Layout.tsx` | Header with auth-aware navigation |

### Data Sources

| Data | Source | Table |
|------|--------|-------|
| Auth session | `supabase.auth.getSession()` | `auth.users` (Supabase internal) |
| User profile | `supabase.from('users').select()` | `public.users` |
| Auth state changes | `supabase.auth.onAuthStateChange()` | Realtime subscription |

### Auth Trigger (Database)

The `handle_new_user()` function runs automatically when a new user signs up:

```
auth.users INSERT
    -> trigger: on_auth_user_created
    -> function: handle_new_user()
    -> INSERT into public.users (id, email, name, avatar, google_id, role='USER')
```

### Session Lifecycle

```
App Mount
    |
    v
AuthProvider.initAuth()
    |
    v
supabase.auth.getSession()
    |
    +--[session exists]--> loadUserProfile(session.user.id)
    |                          |
    |                          v
    |                      SELECT * FROM users WHERE id = :userId
    |                          |
    |                          v
    |                      UPDATE users SET last_login_at = now()
    |                          |
    |                          v
    |                      setUser(mappedUser), setSession(session)
    |
    +--[no session]------> setUser(null), setIsLoading(false)
    |
    v
Subscribe to onAuthStateChange (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
```

### Error Handling

- **Profile not found after signup:** Exponential backoff retry (5 attempts over ~6 seconds) accounts for auth trigger latency
- **Google OAuth failure:** Error displayed on Login page, user stays on login
- **Session expired:** Supabase auto-refreshes tokens; `onAuthStateChange` fires `TOKEN_REFRESHED`
- **Network failure during login:** Error caught and displayed inline

---

## Flow 2: Course Discovery

### Overview

| Field | Value |
|-------|-------|
| **User Type** | Any (public pages, no auth required) |
| **Entry Points** | Direct URL, search engines, social media links |
| **Pages** | Storefront (`/`), CourseDetails (`/course/:id`) |

### Flow Diagram

```
User arrives at /
    |
    v
Storefront loads
    |
    +---> coursesApi.getCourses() -> SELECT * FROM courses WHERE status='PUBLISHED'
    +---> siteContentApi.getContent() -> SELECT * FROM site_content (FAQs, testimonials)
    |
    v
Render: Hero -> Social Proof -> Search/Filters -> Course Grid -> Features ->
        Testimonials -> FAQ -> Student Showcase -> Footer
    |
    +--[Search]--> Filter courses client-side by title match (case-insensitive)
    +--[Type Filter]--> Filter by 'ALL' | 'BUNDLE' | 'MODULE'
    +--[Sort]--> Sort by 'default' | 'price-low' | 'price-high' | 'rating'
    +--[Click Course Card]--> navigate('/course/:id')
    |
    v
Course Details Page (/course/:id)
    |
    +---> coursesApi.getCourse(id) -> SELECT * FROM courses + modules + bundled courses
    +---> useAccessControl(id) -> Check enrollment via enrollmentsApi.checkAccess()
    +---> useVideoUrl(heroVideoId) -> Fetch signed URL for trailer
    |
    v
Render: Video Header -> Tabs (Overview | Curriculum/Courses | Reviews) -> Sidebar
    |
    +--[Has Access]--> CTA: "Continue Learning" -> navigate('/learn/:id')
    +--[Logged In, Not Enrolled]--> CTA: "Enroll Now" -> navigate('/checkout/:id')
    +--[Not Logged In]--> CTA: "Login to Enroll" -> login() (Google OAuth)
```

### Storefront Screen Layout

```
+---------------------------------------------------------------+
| HEADER                                                         |
| [Logo] All Courses  YouTube  [Start Learning / Dashboard]     |
+---------------------------------------------------------------+
| HERO SECTION (Video Background)                               |
| "FILM LIKE A MASTER"                                          |
| [Start Learning Now]  [Watch Trailer]                         |
+---------------------------------------------------------------+
| SOCIAL PROOF TICKER                                           |
| 10,000+ Students / 4.9/5 Rating / 50+ Countries              |
+---------------------------------------------------------------+
| SEARCH + FILTERS                                              |
| [Search...] [ALL] [BUNDLE] [MODULE] Sort: [Default v]        |
+---------------------------------------------------------------+
| COURSE GRID                                                   |
| +----------+ +----------+ +----------+ +----------+          |
| | [Image]  | | [Image]  | | [Image]  | | [Image]  |          |
| | Title    | | Title    | | Title    | | Title    |          |
| | Price    | | Price    | | Price    | | Price    |          |
| | Rating   | | Rating   | | Rating   | | Rating   |          |
| +----------+ +----------+ +----------+ +----------+          |
+---------------------------------------------------------------+
| FEATURES / WHY CHOOSE / TESTIMONIALS / FAQ / FOOTER           |
+---------------------------------------------------------------+
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `Storefront` | `pages/Storefront.tsx` | Main catalog with search, filters, sort |
| `CourseDetails` | `pages/CourseDetails.tsx` | Course detail page with tabs |
| `ReviewList` | `components/ReviewList.tsx` | Course reviews display |
| `useAccessControl` | `hooks/useAccessControl.ts` | Enrollment + admin access check |
| `useVideoUrl` | `hooks/useVideoUrl.ts` | Signed HLS URL for hero video |

### Data Sources

| Data | API Module | Supabase Query |
|------|-----------|----------------|
| Published courses | `coursesApi.getCourses()` | `courses` WHERE `status='PUBLISHED'` |
| Course details | `coursesApi.getCourse(id)` | `courses` + `modules` + `bundle_courses` JOIN |
| Site content (FAQs, etc.) | `siteContentApi.getContent()` | `site_content` table |
| Reviews | `reviewsApi.getCourseReviews()` | `reviews` WHERE `course_id` |
| Access check | `enrollmentsApi.checkAccess()` | `enrollments` WHERE `user_id, course_id, status='ACTIVE'` |

### Search and Filter Logic

```
User Input (search query, type filter, sort selection)
    |
    v
Client-side filtering (all courses loaded on mount):
    1. Text search: course.title.toLowerCase().includes(query)
    2. Type filter: course.type === filterType (or 'ALL')
    3. Sort:
       - 'default': original order
       - 'price-low': ascending by price
       - 'price-high': descending by price
       - 'rating': descending by rating
    |
    v
Filtered + sorted array rendered in grid
```

### CourseDetails CTA Logic

```typescript
handleCTA():
    if (hasAccess)       -> navigate('/learn/:id')    // Enrolled or admin
    if (!user)           -> login()                    // Trigger Google OAuth
    if (user && !enrolled) -> navigate('/checkout/:id') // Go to checkout
```

---

## Flow 3: Purchase Flow

### Overview

| Field | Value |
|-------|-------|
| **Payment Gateway** | Razorpay (via Edge Functions) |
| **Currency** | INR (amounts stored in paise, displayed as rupees) |
| **Auth Required** | Yes (`ProtectedRoute`) |
| **Edge Functions** | `checkout-create-order`, `checkout-verify`, `checkout-webhook` |

### Flow Diagram

```
User clicks "Enroll Now" on CourseDetails
    |
    v
navigate('/checkout/:id')
    |
    v
ProtectedRoute -> Verify authentication
    |
    v
Checkout Page loads
    |
    +---> coursesApi.getCourse(id) -> Load course details
    +---> enrollmentsApi.checkAccess(id) -> Check if already enrolled
    +---> useScript('checkout.razorpay.com/v1/checkout.js') -> Load Razorpay SDK
    |
    +--[Already Enrolled]--> Show "You already own this course" + links
    |
    v
User fills form (name, email, phone) and clicks "Pay"
    |
    v
Step 1: CREATE ORDER
    |
    +---> checkoutApi.createOrder(courseId)
    |         |
    |         v
    |     Edge Function: checkout-create-order
    |         |
    |         +---> Verify JWT auth
    |         +---> Fetch course price from DB
    |         +---> razorpay.orders.create({ amount, currency: 'INR' })
    |         +---> Return: { orderId, amount, currency, key, courseTitle }
    |
    v
Step 2: RAZORPAY CHECKOUT
    |
    +---> new window.Razorpay(options).open()
    |         |
    |         v
    |     Razorpay modal (card/UPI/netbanking)
    |         |
    |         +--[User cancels]--> setStatus('IDLE'), show "Payment cancelled"
    |         +--[Payment succeeds]--> handler callback with response
    |
    v
Step 3: VERIFY PAYMENT
    |
    +---> checkoutApi.verifyPayment({ orderId, paymentId, signature, courseId })
    |         |
    |         v
    |     Edge Function: checkout-verify
    |         |
    |         +---> Verify JWT auth
    |         +---> HMAC-SHA256 signature verification (Razorpay secret)
    |         +---> Verify amount matches course price (Razorpay API call)
    |         +---> INSERT enrollment (status: 'ACTIVE')
    |         +---> [If BUNDLE] -> INSERT enrollment for each bundled course
    |         +---> INSERT payment record (receipt_number: 'EYB-{timestamp}')
    |         +---> INSERT notification ('Enrollment Confirmed')
    |         +---> Send welcome email via Resend (non-blocking)
    |         +---> Send payment receipt email via Resend (non-blocking)
    |         +---> Return: { verified: true, enrollmentId }
    |
    v
Step 4: SUCCESS
    |
    +---> setStatus('SUCCESS')
    +---> Show "Payment Successful!" animation
    +---> navigate('/success?courseId=X&orderId=Y') after 1.5s delay
    |
    v
PurchaseSuccess Page (/success)
    |
    +---> Load course details
    +---> Load payment details
    +---> Show confetti animation (3 seconds)
    +---> Actions: "Start Learning Now", "View All Courses",
    |              "Download Receipt", "Share on Social"
    |
    v
User clicks "Start Learning Now" -> navigate('/learn/:id')
```

### Checkout Page Layout

```
+-------------------------------+-------------------------------+
| ORDER SUMMARY                 | SECURE CHECKOUT               |
|                               |                               |
| [Course Image] Title          | Full Name: [___________]      |
|               Type            | Email:     [___________]      |
|                               | Phone:     [___________]      |
| [Bundle: Includes X courses]  |                               |
|                               | [Pay Rs X,XXX]                |
| Subtotal:     Rs X,XXX       |                               |
| Discount:     - Rs 0         | Powered by Razorpay           |
| --------------------------   |                               |
| Total Due:    Rs X,XXX       |                               |
|                               |                               |
| SSL Secure Payment            |                               |
+-------------------------------+-------------------------------+
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `Checkout` | `pages/Checkout.tsx` | Checkout form + Razorpay integration |
| `PurchaseSuccess` | `pages/PurchaseSuccess.tsx` | Post-purchase success page |
| `checkoutApi` | `services/api/checkout.api.ts` | Order creation + verification calls |
| `useScript` | `hooks/useScript.ts` | Dynamic Razorpay SDK loader |

### Data Sources

| Data | Source | Table/Function |
|------|--------|----------------|
| Course details | `coursesApi.getCourse()` | `courses` |
| Ownership check | `enrollmentsApi.checkAccess()` | `enrollments` |
| Order creation | `checkout-create-order` Edge Function | Razorpay API |
| Payment verify | `checkout-verify` Edge Function | `enrollments`, `payments`, `notifications` |
| Payment record | `paymentsApi.getPaymentByOrder()` | `payments` |

### Webhook Fallback

```
Razorpay server -> POST checkout-webhook (no JWT, uses Razorpay signature)
    |
    v
Verify webhook signature (HMAC-SHA256 with webhook secret)
    |
    v
On 'payment.captured' event:
    -> Create enrollment if not exists
    -> Record payment
    -> Send confirmation emails
```

### Error Handling

- **Razorpay SDK fails to load:** Warning shown, mock mode available in dev
- **Order creation fails:** Error message displayed, user can retry
- **Payment cancelled by user:** Status reset to IDLE, "Payment cancelled" message
- **Signature verification fails:** "Payment verification failed" error
- **Amount mismatch:** Edge Function rejects with "Payment amount mismatch"
- **Duplicate enrollment:** 409 conflict, "Already enrolled" error
- **Bundle partial failure:** Warning with failed course IDs, main enrollment still created
- **Network failure during verification:** "Please contact support" message

---

## Flow 4: Learning Flow

### Overview

| Field | Value |
|-------|-------|
| **Auth Required** | Yes (`ProtectedRoute`) |
| **Video Delivery** | Bunny.net Stream HLS via signed URLs |
| **Access Control** | `useAccessControl` hook (enrollment check + admin bypass) |
| **Course Types** | MODULE (video lessons) and BUNDLE (hub linking to courses) |

### Flow Diagram

```
User clicks "Continue Learning" on Dashboard
    |
    v
navigate('/learn/:id')
    |
    v
ProtectedRoute -> Verify authentication
    |
    v
Learn Page loads
    |
    +---> [Parallel]
    |     coursesApi.getCourse(id) -> Course metadata
    |     coursesApi.getCourseModules(id) -> Module list
    |
    +---> useAccessControl(id) -> Check enrollment
    |         |
    |         +--[No Access]--> EnrollmentGate component (CTA to checkout)
    |         +--[Has Access]--> Continue loading
    |
    +--[Course Type: BUNDLE]--> Bundle Hub View (list of linked courses)
    +--[Course Type: MODULE]--> Video Player View
    |
    v
MODULE Course View:
    |
    +---> Set first module as active
    +---> progressApi.getProgress(courseId) -> Load completion map
    +---> progressApi.getCourseStats(courseId) -> Overall progress %
    +---> progressApi.getResumePosition(courseId, moduleId) -> Resume timestamp
    +---> progressApi.updateCurrentModule(courseId, moduleId) -> Track position
    |
    v
VideoPlayer renders
    |
    +---> useVideoUrl(videoId) -> Edge Function: video-signed-url
    |         |
    |         v
    |     Generate signed HLS URL: SHA256(tokenKey + path + expires)
    |     Return: https://{cdn}/{guid}/playlist.m3u8?token=X&expires=Y
    |
    +---> HLS.js initializes -> Adaptive bitrate streaming
    |
    v
User watches video
    |
    +--[Every 30s while playing]--> progressApi.saveProgress(courseId, moduleId, timestamp)
    +--[On time update]--> Check 95% completion threshold
    +--[Select module]--> Switch active module, load resume position
    +--[Click Next/Prev]--> Navigate between modules
    +--[Keyboard shortcuts]--> Space/K: play/pause, Arrow keys: seek/volume,
    |                          F: fullscreen, M: mute, </> : speed
    +--[Double-tap (mobile)]--> Seek +/- 10 seconds
    |
    v
Course completion -> Flow 5 + Flow 6
```

### Learn Page Layout (MODULE course)

```
+-------------------------------------------+------------------+
| VIDEO PLAYER                              | COURSE SIDEBAR   |
| +---------------------------------------+ | Course Content   |
| | [HLS Video Stream]                    | | X Modules        |
| |                                       | |                  |
| | [Play/Pause overlay]                  | | [x] Module 01    |
| |                                       | |     Title        |
| | [Completion notification]             | |     12:30        |
| |                                       | |                  |
| +---------------------------------------+ | [ ] Module 02    |
| | [Seek bar + buffer indicator]         | |     Title        |
| | [<<] [>||] [>>] [Vol] 3:42/12:30     | |     15:00        |
| |                   [1x] [720p] [PiP] [F]| |                  |
| +---------------------------------------+ | [ ] Module 03    |
|                                           | |     ...         |
| +---------------------------------------+ |                  |
| | [Film icon] Course Title   42% Done   | |                  |
| | [=========>                  ] progress| |                  |
| +---------------------------------------+ +------------------+
|                                           | PERSONAL NOTES   |
| [Module toggle bar - mobile]              | [textarea]       |
+-------------------------------------------+------------------+
```

### Bundle Hub Layout

```
+---------------------------------------------------------------+
| [BUNDLE badge]                                                 |
| Bundle Title                                                   |
| Bundle description                                            |
+---------------------------------------------------------------+
| X Courses in this Bundle               XX% Overall            |
| [===========>                          ] progress bar         |
+---------------------------------------------------------------+
| [Thumbnail] Course 1 Title                                    |
|             Description              X Lessons         [->]   |
+---------------------------------------------------------------+
| [Thumbnail] Course 2 Title                                    |
|             Description              X Lessons         [->]   |
+---------------------------------------------------------------+
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `Learn` | `pages/Learn.tsx` | Video player page + module sidebar |
| `VideoPlayer` | `components/VideoPlayer.tsx` | HLS video player (Bunny.net) |
| `EnrollmentGate` | `components/EnrollmentGate.tsx` | Access denied / enroll CTA |
| `Dashboard` | `pages/Dashboard.tsx` | User's enrolled courses overview |
| `useVideoUrl` | `hooks/useVideoUrl.ts` | Signed URL fetcher for Bunny.net |
| `useAccessControl` | `hooks/useAccessControl.ts` | Enrollment verification |

### Data Sources

| Data | API Module | Table/Function |
|------|-----------|----------------|
| Course metadata | `coursesApi.getCourse()` | `courses` |
| Module list | `coursesApi.getCourseModules()` | `modules` ORDER BY `order_index` |
| Enrollment check | `enrollmentsApi.checkAccess()` | `enrollments` |
| Progress data | `progressApi.getProgress()` | `progress` |
| Course stats | `progressApi.getCourseStats()` | RPC: `get_progress_stats` |
| Resume position | `progressApi.getResumePosition()` | `progress.timestamp` |
| Signed video URL | `video-signed-url` Edge Function | Bunny.net CDN |
| User enrollments | `enrollmentsApi.getUserEnrollments()` | `enrollments` + `courses` JOIN |
| Notes | `localStorage` | Key: `eyebuckz_notes_{courseId}_{moduleId}` |

### Video Player Features

| Feature | Implementation |
|---------|---------------|
| Adaptive bitrate | HLS.js auto-quality selection |
| Quality indicator | Display current resolution (e.g., "720p") |
| Playback speed | Cycle: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x |
| Picture-in-Picture | Native browser PiP API |
| Seek preview | Hover timestamp tooltip on seek bar |
| Buffer indicator | Visual overlay showing buffered range |
| Resume playback | Load `progress.timestamp` on module switch |
| Error recovery | "Retry Loading Video" button, URL refresh |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / K | Play / Pause |
| Arrow Left | Seek back 10s |
| Arrow Right | Seek forward 10s |
| Arrow Up | Volume up 10% |
| Arrow Down | Volume down 10% |
| F | Toggle fullscreen |
| M | Toggle mute |
| < | Decrease playback speed |
| > | Increase playback speed |

---

## Flow 5: Progress Tracking

### Overview

| Field | Value |
|-------|-------|
| **Auto-save Interval** | 30 seconds (`AUTO_SAVE_INTERVAL = 30000ms`) |
| **Completion Threshold** | 95% of video duration (`COMPLETION_THRESHOLD = 0.95`) |
| **Storage** | Supabase `progress` table (per user, per course, per module) |
| **Completion Handler** | `progress-complete` Edge Function (atomic via RPC) |
| **Milestone Notifications** | 25%, 50%, 75%, 100% |

### Flow Diagram

```
Video is playing
    |
    v
Every 30 seconds (setInterval):
    |
    +---> progressApi.saveProgress(courseId, moduleId, timestamp)
    |         |
    |         v
    |     Check for existing progress record
    |         |
    |         +--[Exists]--> RPC: increment_view_count (atomic)
    |         |              Fallback: UPDATE progress SET timestamp
    |         |
    |         +--[New]-----> INSERT progress (view_count: 1, timestamp)
    |
    |     Show toast: "Progress saved"
    |
    v
On every time update (handleTimeUpdate):
    |
    v
Check completion: currentTime / duration >= 0.95?
    |
    +--[Already completed (moduleCompletionMap)]--> Skip
    +--[Below 95%]--> Skip
    +--[Concurrent check in progress]--> Skip (guard ref)
    |
    v
progressApi.checkCompletion(courseId, moduleId, currentTime, duration)
    |
    +---> Get module progress: is it already marked complete?
    |         |
    |         +--[Already complete]--> return false
    |
    +---> progressApi.markComplete(courseId, moduleId, currentTime, duration)
    |         |
    |         v
    |     Edge Function: progress-complete
    |         |
    |         +---> Verify JWT auth
    |         +---> Validate watch threshold (server-side)
    |         +---> RPC: complete_module(user_id, module_id, course_id)
    |         |         |
    |         |         v
    |         |     Atomic DB function:
    |         |       - UPSERT progress (completed=true, completed_at=now)
    |         |       - Calculate: completed_count / total_modules * 100
    |         |       - UPDATE enrollment (overall_percent, completed_modules[])
    |         |       - Return: { completed_count, total_modules, percent }
    |         |
    |         +---> [If percent >= 100] -> Auto-generate certificate (Flow 6)
    |         +---> [If milestone hit] -> INSERT notification
    |         |         25%: "You're 25% through the course. Keep going!"
    |         |         50%: "You're 50% through the course. Keep going!"
    |         |         75%: "You're 75% through the course. Keep going!"
    |         |
    |         +---> Return: { success, progress, stats }
    |
    v
Frontend updates:
    +---> Update moduleCompletionMap (prevent re-trigger)
    +---> Show "Module Completed!" notification (3s)
    +---> Reload course stats (progress bar update)
```

### Progress Data Model

```
progress table:
+-------------+---------+--------+-----------+-----------+----------+------------+-----------+
| user_id     | course_id | module_id | timestamp | completed | completed_at | watch_time | view_count |
+-------------+---------+--------+-----------+-----------+----------+------------+-----------+
| uuid        | uuid      | uuid      | int (sec) | boolean   | timestamp    | int (sec)  | int        |
+-------------+---------+--------+-----------+-----------+----------+------------+-----------+

Unique constraint: (user_id, course_id, module_id)
RLS: Users can only read/write their own progress rows
```

### Resume Position Flow

```
User switches to a different module (setActiveChapterId)
    |
    v
useEffect triggers:
    |
    +---> progressApi.getResumePosition(courseId, moduleId)
    |         |
    |         v
    |     SELECT timestamp FROM progress
    |     WHERE user_id AND course_id AND module_id
    |         |
    |         v
    |     If timestamp > 0: videoRef.current.currentTime = timestamp
    |
    +---> progressApi.updateCurrentModule(courseId, moduleId)
              |
              v
          UPDATE enrollments SET current_module = moduleId
          WHERE user_id AND course_id AND status = 'ACTIVE'
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `progressApi` | `services/api/progress.api.ts` | All progress read/write operations |
| `progress-complete` | `supabase/functions/progress-complete/index.ts` | Server-side completion logic |
| `complete_module` | SQL RPC function | Atomic completion + stats calculation |
| `get_progress_stats` | SQL RPC function | Course-level progress summary |
| `increment_view_count` | SQL RPC function | Atomic view counter |

### Error Handling

- **Save progress fails silently:** No error shown to user, next interval retries
- **Completion check concurrency guard:** `completionCheckingRef` prevents duplicate calls
- **Edge Function failure:** Error logged, completion notification not shown, retried on next threshold crossing
- **RPC fallback:** If `increment_view_count` RPC doesn't exist, falls back to basic UPDATE

---

## Flow 6: Certificate Generation

### Overview

| Field | Value |
|-------|-------|
| **Trigger** | Automatic when `progress.percent >= 100` |
| **Generator** | `progress-complete` Edge Function (auto) or `certificate-generate` Edge Function (manual/admin) |
| **Certificate Number Format** | `EYB-CERT-{random alphanumeric}` |
| **Storage** | `certificates` table |
| **Status** | `ACTIVE` or `REVOKED` |

### Flow Diagram

```
Module completion triggers progress-complete Edge Function
    |
    v
RPC complete_module returns { percent: 100 }
    |
    v
Check: Does certificate already exist for (user_id, course_id)?
    |
    +--[Exists]--> Skip (idempotent)
    |
    +--[New]-----> Generate certificate
                       |
                       v
                   Fetch user profile (name, email)
                   Fetch course (title)
                       |
                       v
                   Generate certificate number: EYB-CERT-{random}
                       |
                       v
                   INSERT INTO certificates:
                       user_id, course_id, certificate_number,
                       student_name, course_title, issue_date,
                       completion_date, status='ACTIVE'
                       |
                       v
                   INSERT notification:
                       type: 'certificate'
                       title: 'Course Completed!'
                       message: "Congratulations! You've completed {title}
                                and earned a certificate!"
                       link: '/dashboard'
                       |
                       v
                   User sees notification (Realtime subscription)
```

### Certificate Data Model

```
certificates table:
+----+---------+-----------+--------------------+--------------+--------------+------------+
| id | user_id | course_id | certificate_number | student_name | course_title | issue_date |
+----+---------+-----------+--------------------+--------------+--------------+------------+
| uuid | uuid  | uuid      | EYB-CERT-XXX       | string       | string       | timestamp  |
+----+---------+-----------+--------------------+--------------+--------------+------------+

Additional: completion_date, download_url, status, revoked_at, revoked_reason
RLS: Users can only read their own certificates
```

### Viewing Certificates

```
User navigates to /profile
    |
    v
Profile page loads
    |
    +---> certificatesApi.getUserCertificates()
    |         |
    |         v
    |     SELECT * FROM certificates
    |     WHERE user_id = :userId AND status = 'ACTIVE'
    |     ORDER BY created_at DESC
    |
    v
Display certificate list:
    +-------------------------------------------------------+
    | [Award icon] My Certificates                          |
    |                                                       |
    | Course Title                                          |
    | Issued March 1, 2026 . EYB-CERT-A1B2C3              |
    |                                    [Download]         |
    +-------------------------------------------------------+
```

### Admin Certificate Management

```
Admin navigates to /admin/certificates
    |
    v
adminApi.getCertificates() -> List all certificates with pagination
    |
    v
Admin actions:
    +--[Issue manually]--> adminApi.issueCertificate(userId, courseId)
    |                          -> Edge Function: certificate-generate
    |
    +--[Revoke]--> adminApi.revokeCertificate(certificateId, reason)
                       -> UPDATE certificates SET status='REVOKED', revoked_at, revoked_reason
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `certificatesApi` | `services/api/certificates.api.ts` | User-facing certificate queries |
| `progress-complete` | `supabase/functions/progress-complete/index.ts` | Auto-generation on completion |
| `certificate-generate` | `supabase/functions/certificate-generate/index.ts` | Manual generation (admin) |
| `Profile` | `pages/Profile.tsx` | Certificate listing + download |
| `CertificatesPage` | `pages/admin/CertificatesPage.tsx` | Admin certificate management |

---

## Flow 7: Profile Management

### Overview

| Field | Value |
|-------|-------|
| **Auth Required** | Yes (`ProtectedRoute`) |
| **Editable Fields** | Name, phone number (E.164 format) |
| **Read-only Fields** | Email (from Google OAuth) |
| **Additional Sections** | Certificates, payment history |

### Flow Diagram

```
User clicks "View Profile" from Dashboard or header
    |
    v
navigate('/profile')
    |
    v
ProtectedRoute -> Verify authentication
    |
    v
Profile page loads
    |
    +---> [Parallel]
    |     certificatesApi.getUserCertificates() -> Certificates list
    |     paymentsApi.getUserPayments() -> Payment history
    |
    v
Profile Card:
    +-------------------------------------------------------+
    | [Avatar] Name [Edit]                                  |
    |          Email (read-only)                            |
    |          Phone: [+1555...] [Save]                     |
    +-------------------------------------------------------+
    |
    v
Edit Name:
    +---> Click edit icon -> Inline text input
    +---> Save -> updateProfile({ name }) via AuthContext
    |         |
    |         v
    |     UPDATE users SET name WHERE id
    |     setUser({ ...user, name })
    |
    v
Add/Edit Phone:
    +---> Enter E.164 phone -> Click Save
    +---> Validate: /^\+[1-9]\d{1,14}$/
    |         |
    |         +--[Invalid]--> Show "Enter a valid number" error
    |         +--[Valid]----> updatePhoneNumber(phone) via AuthContext
    |                             |
    |                             v
    |                         UPDATE users SET phone_e164 WHERE id
    |                         setUser({ ...user, phone_e164 })
    |
    v
Certificates Section:
    +---> Display list with certificate number + issue date
    +---> Download link (if download_url exists)
    |
    v
Payment History Section:
    +---> Display table: Date | Course | Amount | Status | Receipt
    +---> Status badges: captured (green), refunded (yellow), failed (red)
    +---> Download receipt -> Opens printable HTML in new window
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `Profile` | `pages/Profile.tsx` | Profile view/edit, certificates, payments |
| `AuthContext` | `context/AuthContext.tsx` | `updateProfile()`, `updatePhoneNumber()` |
| `certificatesApi` | `services/api/certificates.api.ts` | User certificate queries |
| `paymentsApi` | `services/api/payments.api.ts` | User payment history |

### Data Sources

| Data | API Module | Table |
|------|-----------|-------|
| User profile | `useAuth()` context | `users` |
| Certificates | `certificatesApi.getUserCertificates()` | `certificates` |
| Payments | `paymentsApi.getUserPayments()` | `payments` JOIN `courses` |

### Error Handling

- **Certificate load failure:** Error message with "Try again" button
- **Payment load failure:** Error message with "Try again" button
- **Name update failure:** Reverts to previous name
- **Phone validation failure:** Inline error message

---

## Flow 8: Admin Workflows

### Overview

| Field | Value |
|-------|-------|
| **Auth Required** | Yes (`ProtectedRoute` + admin role check) |
| **Role Check** | `user.role === 'ADMIN'` (stored in `users.role`) |
| **RLS Enforcement** | `is_admin()` SQL function checks JWT claims |
| **Layout** | `AdminLayout` with sidebar navigation |

### Admin Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | `DashboardPage` | Analytics overview |
| `/admin/courses` | `CoursesPage` | Course listing |
| `/admin/courses/new` | `CourseEditorPage` | Create course |
| `/admin/courses/:courseId` | `CourseEditorPage` | Edit course |
| `/admin/users` | `UsersPage` | User management |
| `/admin/users/:userId` | `UserDetailPage` | User detail + enrollment |
| `/admin/certificates` | `CertificatesPage` | Certificate management |
| `/admin/content` | `ContentPage` | CMS content (FAQs, testimonials) |
| `/admin/payments` | `PaymentsPage` | Payment management + refunds |
| `/admin/reviews` | `ReviewsPage` | Review moderation |

### Admin Dashboard Flow

```
Admin navigates to /admin
    |
    v
AdminLayout renders sidebar + content area
    |
    v
DashboardPage loads
    |
    +---> [Parallel]
    |     adminApi.getStats() -> RPC: get_admin_stats
    |         -> Total users, enrollments, revenue, courses
    |     adminApi.getSales(30) -> RPC: get_sales_data
    |         -> Daily revenue for chart
    |     adminApi.getRecentActivity(10) -> RPC: get_recent_activity
    |         -> Latest enrollments, completions, payments
    |
    v
Render: Stats cards + Revenue chart (Recharts) + Activity feed
```

### Course Management Flow

```
Admin navigates to /admin/courses
    |
    v
adminApi.getCourses() -> All courses with module/enrollment counts
    |
    v
Course listing table with actions
    |
    +--[Create New]--> navigate('/admin/courses/new')
    |                      |
    |                      v
    |                  CourseEditorPage (create mode)
    |                      - Title, slug, description, price
    |                      - Type: MODULE or BUNDLE
    |                      - Features list, thumbnail URL, hero video ID
    |                      - adminApi.createCourse(data) -> INSERT courses
    |
    +--[Edit]--> navigate('/admin/courses/:courseId')
    |                |
    |                v
    |            CourseEditorPage (edit mode)
    |                - Load existing: adminApi.getCourses() + adminApi.getModules()
    |                - Update: adminApi.updateCourse(id, data) -> UPDATE courses
    |                - Module management (for MODULE courses):
    |                    + Add module: adminApi.createModule()
    |                    + Edit module: adminApi.updateModule()
    |                    + Delete module: adminApi.deleteModule()
    |                    + Reorder: adminApi.reorderModules()
    |                - Bundle management (for BUNDLE courses):
    |                    + Get linked: adminApi.getBundleCourses()
    |                    + Set linked: adminApi.setBundleCourses()
    |
    +--[Publish/Unpublish]--> adminApi.publishCourse(id, 'PUBLISHED' | 'DRAFT')
    |
    +--[Archive]--> adminApi.deleteCourse(id) -> SET deleted_at (soft delete)
    +--[Restore]--> adminApi.restoreCourse(id) -> SET deleted_at = null
```

### Video Upload Flow

```
Admin opens CourseEditorPage for a MODULE course
    |
    v
Click "Upload Video" on a module
    |
    v
VideoUploader component
    |
    +---> Select video file
    +---> Upload to Edge Function: admin-video-upload
    |         |
    |         v
    |     Edge Function:
    |         +---> Verify JWT + admin role
    |         +---> Create Bunny.net library video
    |         +---> Upload file to Bunny.net Stream
    |         +---> Return: { videoId, videoUrl }
    |
    +---> Update module with new video URL
    +---> adminApi.updateModule(courseId, moduleId, { videoUrl })
```

### User Management Flow

```
Admin navigates to /admin/users
    |
    v
adminApi.getUsers({ page, search, role }) -> Paginated user list
    |
    v
User table: Name | Email | Role | Enrollments | Joined | Actions
    |
    +--[Search]--> Filter by name/email
    +--[Filter by role]--> USER / ADMIN
    |
    +--[View Details]--> navigate('/admin/users/:userId')
    |                        |
    |                        v
    |                    adminApi.getUserDetails(id)
    |                        -> User profile + enrollments + courses
    |                        |
    |                        v
    |                    Admin actions:
    |                        +--[Toggle Active]--> adminApi.updateUser(id, { isActive })
    |                        +--[Change Role]----> adminApi.updateUser(id, { role })
    |                        +--[Manual Enroll]--> adminApi.manualEnrollUser(userId, courseId)
    |                        +--[Revoke Enrollment]--> adminApi.revokeEnrollment(enrollmentId)
```

### Refund Processing Flow

```
Admin navigates to /admin/payments
    |
    v
adminApi.getPayments({ page, search }) -> Paginated payment list
    |
    v
Payment table: Date | User | Course | Amount | Status | Actions
    |
    +--[Process Refund]-->
    |     |
    |     v
    |  Confirm dialog with reason input
    |     |
    |     v
    |  adminApi.processRefund(paymentId, reason)
    |     |
    |     v
    |  Edge Function: refund-process
    |     |
    |     +---> Verify JWT + admin role
    |     +---> Razorpay API: POST /v1/payments/{id}/refund
    |     +---> UPDATE payments SET status='refunded', refund_id, refund_amount, refund_reason
    |     +---> UPDATE enrollment SET status='REVOKED'
    |     +---> INSERT notification for user
    |     +---> Return: { success, refundId }
```

### Review Moderation Flow

```
Admin navigates to /admin/reviews
    |
    v
adminApi.getReviews({ page, search }) -> Paginated review list
    |
    v
Review table: User | Course | Rating | Comment | Date | Actions
    |
    +--[Delete Review]--> adminApi.deleteReview(reviewId)
                              -> DELETE FROM reviews WHERE id
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `AdminLayout` | `pages/admin/AdminLayout.tsx` | Sidebar + content shell |
| `AdminRoutes` | `pages/admin/AdminRoutes.tsx` | Admin sub-routing |
| `DashboardPage` | `pages/admin/DashboardPage.tsx` | Analytics overview |
| `CoursesPage` | `pages/admin/CoursesPage.tsx` | Course listing |
| `CourseEditorPage` | `pages/admin/CourseEditorPage.tsx` | Create/edit course + modules |
| `UsersPage` | `pages/admin/UsersPage.tsx` | User management |
| `UserDetailPage` | `pages/admin/UserDetailPage.tsx` | User detail + enrollment |
| `PaymentsPage` | `pages/admin/PaymentsPage.tsx` | Payment management |
| `CertificatesPage` | `pages/admin/CertificatesPage.tsx` | Certificate management |
| `ContentPage` | `pages/admin/ContentPage.tsx` | CMS content editor |
| `ReviewsPage` | `pages/admin/ReviewsPage.tsx` | Review moderation |
| `VideoUploader` | `components/VideoUploader.tsx` | Bunny.net video upload |
| `adminApi` | `services/api/admin.api.ts` | All admin operations |

---

## Route Map

### Public Routes (No Auth)

| Route | Component | Lazy-loaded |
|-------|-----------|-------------|
| `/` | `Storefront` | No |
| `/login` | `Login` | No |
| `/course/:id` | `CourseDetails` | No |
| `/privacy` | `Privacy` | No |
| `/terms` | `Terms` | No |

### Protected Routes (Auth Required)

| Route | Component | Lazy-loaded | Notes |
|-------|-----------|-------------|-------|
| `/checkout/:id` | `Checkout` | Yes | Redirects to login if unauthenticated |
| `/dashboard` | `Dashboard` | Yes | User's enrolled courses |
| `/learn/:id` | `Learn` | Yes | Video player + progress |
| `/profile` | `Profile` | Yes | User profile + certificates |
| `/success` | `PurchaseSuccess` | Yes | Post-purchase confirmation |
| `/admin/*` | `AdminRoutes` | Yes | Admin panel (role checked in components) |

### Catch-All

| Route | Behavior |
|-------|----------|
| `*` | `Navigate to="/" replace` |

---

## Edge Cases & Error Handling

### Authentication Edge Cases

| Scenario | Handling |
|----------|----------|
| Auth trigger latency (profile not yet created) | Exponential backoff retry: 200ms, 400ms, 800ms, 1600ms, 3000ms |
| Session expired mid-action | Supabase auto-refresh; `onAuthStateChange` updates state |
| Browser back after logout | `ProtectedRoute` redirects to `/login` |
| Multiple tabs with different sessions | `onAuthStateChange` keeps all tabs in sync |
| OAuth redirect fails | Error displayed on login page |

### Payment Edge Cases

| Scenario | Handling |
|----------|----------|
| Razorpay modal dismissed | Status reset to IDLE, "Payment cancelled" shown |
| Double payment for same course | Server returns 409 ("Already enrolled") |
| Amount mismatch (tampering) | Server validates against Razorpay API, rejects |
| Signature verification failure | "Payment verification failed. Contact support." |
| Bundle with partial enrollment failures | Warning displayed, main bundle enrollment still created |
| Network loss during verification | "Payment verification failed. Contact support." |
| Webhook arrives before client verify | Idempotent -- enrollment created once via upsert |

### Video Playback Edge Cases

| Scenario | Handling |
|----------|----------|
| HLS.js not supported | Fallback to native `<video>` element |
| Signed URL expired | "Retry Loading Video" button refreshes URL |
| Network interruption during playback | HLS.js auto-retries, error overlay if persistent |
| Browser does not support PiP | PiP button hidden via `document.pictureInPictureEnabled` |
| Module has no video URL | Blank player area, module still navigable |

### Progress Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate completion calls | `completionCheckingRef` prevents concurrent async calls |
| Module already completed | Frontend checks `moduleCompletionMap`, skips API call |
| Server-side threshold mismatch | Edge Function re-validates 95% threshold |
| Progress save fails | Silent failure, retried on next 30s interval |
| User closes browser mid-video | Last saved progress (up to 30s ago) available on return |

### Admin Edge Cases

| Scenario | Handling |
|----------|----------|
| Non-admin accesses /admin | Components check `user.role`, RLS blocks API calls |
| JWT expired during admin action | Auth refresh attempted once, then "Session expired" error |
| Delete course with enrollments | Soft delete (`deleted_at`) preserves data |
| Manual enrollment duplicate | PostgreSQL unique constraint returns "User is already enrolled" |
| Refund for already-refunded payment | Razorpay API returns error, propagated to admin |
