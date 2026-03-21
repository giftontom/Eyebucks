# Owner Manual Test Plan — Eyebuckz LMS

> **Purpose:** Step-by-step user flows the owner personally executes in a real browser to verify the LMS works end-to-end before launch.
>
> **Environments:**
>
> - Staging: `dev.eyebuckz.com` — run **all flows** here first
> - Production: `eyebuckz.com` — run **critical flows (1, 2, 3, 5)** after deploy
>
> **Razorpay test card:** `4111 1111 1111 1111` | Expiry: `12/26` | CVV: `123` | OTP: `123456`

---

## Section 1 — Pre-Test Setup

### Required Conditions

- [ ] Staging environment deployed and accessible at `dev.eyebuckz.com`
- [ ] Seed data applied (`supabase db reset` on local, or seed SQL run on staging DB)
- [ ] At least 3 PUBLISHED courses in the database (mix of MODULE and BUNDLE types)
- [ ] All 11 Edge Functions deployed (`supabase functions deploy --all`)
- [ ] All Supabase secrets set: `RESEND_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, Bunny.net secrets
- [ ] `.env` / Cloudflare Pages env vars set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`
- [ ] Razorpay test mode enabled in dashboard
- [ ] Valid coupon code created in DB for coupon tests (e.g. `TESTOFF10`)

### Test Accounts Needed

| Account                          | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| **Regular Google account** | All user-facing flows (purchase, learning, profile)                    |
| **Admin Google account**   | Flow 8 (Admin Panel); must have `role = 'ADMIN'` in `public.users` |

### Tools to Have Open

- Browser DevTools → **Network tab** (watch for failed requests)
- Browser DevTools → **Console tab** (watch for red errors)
- **Email inbox** for the Google account used (enrollment and receipt email checks)
- **Razorpay dashboard** (test mode) → Payments tab
- **Supabase dashboard** → Table Editor → `enrollments` and `payments` tables

---

## Section 2 — Flow 1: Guest Browsing & Course Discovery

Open an **incognito/private window** for this flow.

| Step | Action                                                       | Expected Result                                                                                   |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1    | Navigate to `/#/`                                          | Storefront loads; hero carousel shows; course grid renders with at least 1 course card            |
| 2    | Click the "MODULE" filter button                             | Only MODULE type courses appear; "MODULE" badge visible on each card                              |
| 3    | Type a keyword in the search bar that matches a course title | Course grid narrows in real time; ✕ clear button appears in search input                         |
| 4    | Click ✕ to clear search                                     | All courses reappear                                                                              |
| 5    | Click any course card                                        | Navigates to `/#/course/:id`; full course details page loads with title, description, and price |
| 6    | Verify tab bar is visible                                    | OVERVIEW, CURRICULUM, and REVIEWS tabs all visible; OVERVIEW is active by default                 |
| 7    | Click**CURRICULUM** tab                                | Chapter list expands; each chapter row shows title and duration                                   |
| 8    | Click any chapter row                                        | "Enroll to unlock this content" message or enrollment gate appears (not enrolled, so no video)    |
| 9    | Click**REVIEWS** tab                                   | Review list renders OR "No reviews yet" empty state — no error                                   |

**✅ Pass criteria:** All 9 steps complete without errors. Console shows no red errors.

---

## Section 3 — Flow 2: Authentication

| Step | Action                                       | Expected Result                                                    |
| ---- | -------------------------------------------- | ------------------------------------------------------------------ |
| 1    | Click**"Login"** in the navigation bar | Login page (`/#/login`) loads with "Continue with Google" button |
| 2    | Click**"Continue with Google"**        | Google OAuth popup or redirect opens                               |
| 3    | Sign in with your regular Google account     | Redirects back to `/#/`; user name or avatar appears in nav bar  |
| 4    | Refresh the page                             | User session persists; still logged in; no redirect to login       |
| 5    | *(Production only)* Inspect the nav bar    | No "Dev Login" button visible                                      |

**✅ Pass criteria:** Google OAuth completes without errors. Session persists across page refresh.

---

## Section 4 — Flow 3: Full Purchase (Happy Path)

Ensure you are **logged in** from Flow 2 before starting.

| Step | Action                                                                   | Expected Result                                                                            |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 1    | Click a MODULE course card from the Storefront                           | Course Details page (`/#/course/:id`) loads                                              |
| 2    | Check the CTA button near the price                                      | Shows**"Enroll Now"** with price in ₹ — not "Continue Learning"                    |
| 3    | Click**"Enroll Now"**                                              | Navigates to `/#/checkout/:id`                                                           |
| 4    | Verify order summary on checkout page                                    | Shows correct course title and price                                                       |
| 5    | *(If test coupon exists)* Enter `TESTOFF10` → click **Apply** | Discount % displayed; pay button price reduces accordingly                                 |
| 6    | Click**"Pay ₹XXX"**                                               | Razorpay checkout modal opens                                                              |
| 7    | Enter test card `4111 1111 1111 1111`, expiry `12/26`, CVV `123`   | Card details accepted                                                                      |
| 8    | Enter OTP `123456` if prompted                                         | OTP accepted                                                                               |
| 9    | Payment completes                                                        | Modal closes; "Payment Successful!" overlay or message appears in app                      |
| 10   | Wait ~1.5 seconds                                                        | Redirects to `/#/success?courseId=...&orderId=...`                                       |
| 11   | Verify success page                                                      | Confetti animation plays; course title shown;**"Start Learning Now"** button visible |
| 12   | Open Supabase dashboard →`enrollments` table                          | New row exists for your user + this course with `status = 'ACTIVE'`                      |
| 13   | Open Razorpay test dashboard → Payments                                 | New payment captured with correct amount                                                   |

**✅ Pass criteria:** Payment recorded in Razorpay test dashboard; enrollment row created in Supabase `enrollments` table with `status = 'ACTIVE'`.

---

## Section 5 — Flow 4: Post-Purchase Emails

Check email within **60 seconds** of completing Flow 3.

| Step | Action                                             | Expected Result                                                                                           |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Open inbox of the Google account used for purchase | **"Enrollment Confirmation"** email received                                                        |
| 2    | Open the enrollment email                          | Course title, student name, and "Start Learning" CTA button visible; branded HTML layout (not plain text) |
| 3    | Check inbox again (within 60s of purchase)         | **"Payment Receipt"** email received                                                                |
| 4    | Open the receipt email                             | Amount in ₹, unique receipt number, and course name all visible                                          |

**✅ Pass criteria:** Both emails arrive within 5 minutes.

⚠️ **If emails don't arrive:** Check [resend.com](https://resend.com) dashboard → Logs. Also check Supabase Edge Function logs for `checkout-verify` errors.

---

## Section 6 — Flow 5: Learning (Video Player & Modules)

Continue from the success page after Flow 3.

| Step | Action                                                                            | Expected Result                                                                                                                                                            |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Click**"Start Learning Now"** on the success page                           | `/#/learn/:id` loads                                                                                                                                                     |
| 2    | Verify module list in left sidebar                                                | All course chapters listed; first module is selected/highlighted                                                                                                           |
| 3    | Observe the video player area                                                     | Either video plays (real Bunny GUID) OR shows**"Network error: unable to load video"** (expected with seed GUIDs) — ⚠️ **NOT** "Video format not supported" |
| 4    | Click a different module in the sidebar                                           | Player switches to that module; sidebar highlights new selection                                                                                                           |
| 5    | *(If real video available)* Play video past **95% completion**            | "Module Completed! ✓" notification appears top-right; auto-dismisses after ~3 seconds                                                                                     |
| 6    | Verify the sidebar after completion                                               | Completed module shows a filled checkmark                                                                                                                                  |
| 7    | Verify progress bar below or above player                                         | Course completion % has increased                                                                                                                                          |
| 8    | Type text in the**Notes** textarea (desktop sidebar)                        | Text accepted; no errors                                                                                                                                                   |
| 9    | Refresh the page                                                                  | Notes text persists; same module is resumed at correct position                                                                                                            |
| 10   | *(Mobile — 375px viewport)* Tap the module list button at the bottom of screen | Drawer slides up showing the full module list                                                                                                                              |

**✅ Pass criteria:** Module switching works; progress % increases on completion; notes persist after page refresh.

---

## Section 7 — Flow 6: Dashboard & Progress

| Step | Action                                                                           | Expected Result                                                                             |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | Navigate to `/#/dashboard`                                                     | "My Studio" (or equivalent) page loads; enrolled course card is visible                     |
| 2    | Inspect the enrolled course card                                                 | Shows course thumbnail, progress bar, and "In Progress" status                              |
| 3    | Inspect the stats row at top                                                     | Shows: Enrolled: 1, In Progress: 1, Completed: 0 (or accurate values based on your testing) |
| 4    | Click**"Continue Learning"** on the course card                            | Navigates to `/#/learn/:id`                                                               |
| 5    | Navigate back to `/#/dashboard` → click **"Saved"** tab                 | Wishlist section shows OR displays "No saved courses yet" empty state — no error           |
| 6    | Navigate to `/#/` (Storefront) → click the **heart icon** on any course | Course added to wishlist; heart icon fills/changes color                                    |
| 7    | Navigate to `/#/dashboard` → **Saved** tab                              | The just-saved course now appears in the wishlist                                           |

**✅ Pass criteria:** Dashboard reflects accurate enrollment count and progress data. Wishlist updates correctly.

---

## Section 8 — Flow 7: Profile, Certificates & Receipts

| Step | Action                                                                      | Expected Result                                                                         |
| ---- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | Navigate to `/#/profile`                                                  | Profile page loads with name, email, and avatar initial displayed                       |
| 2    | Click the**pencil/edit icon** next to your name                       | Name input field appears inline; Save and Cancel buttons appear                         |
| 3    | Clear the name field, type `Test Name`, click **Save**              | Name updates in the UI; edit mode exits; updated name persists                          |
| 4    | Locate the phone number field; enter `+15550000000`, click **Save** | Green checkmark appears; phone field becomes read-only                                  |
| 5    | Scroll to**"My Certificates"** section                                | Certificate list renders OR "No certificates earned yet" empty state                    |
| 6    | *(If certificate exists)* Click **"Download"** button               | PDF opens in a new browser tab                                                          |
| 7    | Scroll to**"Payment History"** section                                | Shows at least one payment row with: course title, amount (₹), "captured" status badge |
| 8    | Click**"Receipt"** button on a payment row                            | Browser print dialog opens with a formatted receipt                                     |

**✅ Pass criteria:** Profile edits save and persist. Certificate download works. Receipt print dialog opens correctly.

---

## Section 9 — Flow 8: Admin Panel

**Log in as your ADMIN account** before starting this flow.

| Step | Action                                                                      | Expected Result                                                                    |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | Navigate to `/#/admin`                                                    | KPI dashboard loads: total users, total revenue, total enrollments, active courses |
| 2    | Navigate to `/#/admin/courses`                                            | Course list table with title, status badge, and course type for each row           |
| 3    | Find a**PUBLISHED** course → click **"Unpublish"** (or toggle) | Confirmation modal appears                                                         |
| 4    | Confirm the action                                                          | Status badge changes to**DRAFT**; success toast appears                      |
| 5    | Click**"Publish"** on the same course → confirm                      | Status returns to**PUBLISHED**; success toast appears                        |
| 6    | Navigate to `/#/admin/payments`                                           | Test payment row visible with receipt number, amount, and status                   |
| 7    | Navigate to `/#/admin/users`                                              | User list visible; click your test user → their enrollments are shown             |
| 8    | Navigate to `/#/admin/certificates`                                       | Certificate list renders;**"Issue Manually"** button visible                 |
| 9    | Navigate to `/#/admin/coupons`                                            | Coupon list with code, discount %, usage count                                     |
| 10   | Navigate to `/#/admin/audit`                                              | Audit log shows recent actions (course publish/unpublish from steps 3–5)          |

**✅ Pass criteria:** All CRUD actions complete successfully. Toast notifications appear on success/error. No blank pages.

---

## Section 10 — Error & Edge Case Flows

### Payment Failure

| Step | Action                                                              | Expected Result                                                                      |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Go to Checkout for a course you don't own; open Razorpay modal      | Modal open                                                                           |
| 2    | Use card number `4000 0000 0000 0002` (or dismiss Razorpay modal) | Payment is declined or cancelled                                                     |
| 3    | Modal closes                                                        | App shows a**"Payment failed"** or **"Payment cancelled"** error message |
| 4    | Verify the**"Pay ₹XXX"** button                              | Button is re-enabled; can attempt payment again                                      |

### Invalid Coupon

| Step | Action                                                                      | Expected Result                                            |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | On the Checkout page, enter `BADCODE` → click **Apply**            | Red error message: "Invalid coupon code" or similar        |
| 2    | Enter a valid test coupon code (e.g.`TESTOFF10`) → click **Apply** | Green success message; price reduces by correct discount % |

### Already Enrolled Guard

| Step | Action                                                                                  | Expected Result                                                                      |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Directly navigate to `/#/checkout/:id` for the course you already purchased in Flow 3 | Full-page message:**"You already own this course!"** — no checkout form shown |

### Unauthenticated Access Guards

| Step | Action                                                                        | Expected Result                                                  |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Open `/#/learn/:id` in a fresh **incognito window**                   | Redirected to `/#/login`                                       |
| 2    | Open `/#/checkout/:id` in the same incognito window                         | Redirected to `/#/login`                                       |
| 3    | Open `/#/dashboard` in incognito                                            | Redirected to `/#/login`                                       |
| 4    | Log in as your regular (non-admin) Google account → navigate to `/#/admin` | Redirected away (access denied / redirected to home or 403 page) |

**✅ Pass criteria:** All error states display a visible, actionable message. Recovery paths exist (retry button, redirect to correct page). No silent failures.

---

## Section 11 — Mobile Responsiveness Checklist

Test at **375px viewport width** (iPhone SE / Chrome DevTools Device Toolbar → iPhone SE preset).

| Page                     | Checks                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storefront**     | - [ ] Course grid stacks to 1 column`<br>`- [ ] Hero text is readable and doesn't overflow`<br>`- [ ] Search bar and filters are accessible without horizontal scroll    |
| **Course Details** | - [ ] Sticky bottom CTA (Enroll Now) is fully visible`<br>`- [ ] OVERVIEW / CURRICULUM / REVIEWS tabs scroll horizontally without breaking layout                          |
| **Checkout**       | - [ ] All form fields are full width`<br>`- [ ] Pay button is full width and tappable`<br>`- [ ] Coupon input and Apply button visible without scrolling                 |
| **Dashboard**      | - [ ] Course cards stack vertically`<br>`- [ ] Stats row (Enrolled / In Progress / Completed) wraps gracefully                                                             |
| **Learn**          | - [ ] Module list button visible at bottom of screen`<br>`- [ ] Tap → module drawer slides up from bottom`<br>`- [ ] Swipe left/right switches modules (if implemented) |
| **Profile**        | - [ ] Payment history table is readable (or switches to card layout)`<br>`- [ ] Receipt button is visible and tappable                                                     |
| **Admin**          | - [ ] Admin nav is accessible (sidebar collapses or top nav visible on mobile)`<br>`- [ ] KPI cards stack vertically                                                       |

**✅ Pass criteria:** All pages usable at 375px. No text overflow, no hidden buttons, no broken layouts.

---

## Section 12 — Pass / Fail Summary Table

Complete this table as you run each flow. Mark ✅ PASS, ❌ FAIL, or ⚠️ PARTIAL.

| #  | Flow                              | Steps   | Status | Notes                                                                                                   |
| -- | --------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------- |
| 1  | Guest Browsing & Course Discovery | 9       |        | ❌ FAIL if: Storefront blank, courses don't load, tabs broken                                           |
| 2  | Authentication                    | 5       |        | ❌ FAIL if: Google OAuth fails, session lost on refresh                                                 |
| 3  | Full Purchase                     | 13      |        | ❌ FAIL if: Order not created, Razorpay won't open, payment verify fails, no redirect to `/success`   |
| 4  | Post-Purchase Emails              | 4       |        | ❌ FAIL if: No enrollment email OR no receipt email within 5 minutes                                    |
| 5  | Learning (Video & Modules)        | 10      |        | ❌ FAIL if: Modules don't switch, progress not tracked, notes lost on refresh                           |
| 6  | Dashboard & Progress              | 7       |        | ❌ FAIL if: Enrolled course missing from dashboard, progress % wrong, wishlist broken                   |
| 7  | Profile / Certificates / Receipts | 8       |        | ❌ FAIL if: Certificate absent after full completion, PDF broken, name edit fails, receipt print broken |
| 8  | Admin Panel                       | 10      |        | ❌ FAIL if: Dashboard blank, publish toggle fails, payments not visible in admin                        |
| 9  | Error & Edge Case Flows           | 11      |        | ❌ FAIL if: Errors are silent, no recovery path shown, wrong error message displayed                    |
| 10 | Mobile Responsiveness             | 7 pages |        | ❌ FAIL if: Any page is unusable at 375px viewport                                                      |

### Launch Gate

> **All 8 main flows must PASS and the console must show no red errors on critical paths (flows 1–5) before deploying to production.**

---

*Last updated: March 19, 2026*
