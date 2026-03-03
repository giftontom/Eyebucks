# 🎬 Eyebuckz LMS - Detailed User Flow Documentation

## Table of Contents
1. [Flow 1: Guest User Browsing](#flow-1-guest-user-browsing)
2. [Flow 2: New User Registration + Purchase](#flow-2-new-user-registration--purchase)
3. [Flow 3: Enrolled User Learning Experience](#flow-3-enrolled-user-learning-experience)
4. [Flow 4: Returning User Session](#flow-4-returning-user-session)
5. [Flow 5: Admin User Management](#flow-5-admin-user-management)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Flow 1: Guest User Browsing

### Overview
**User Type:** Anonymous visitor (not logged in)
**Goal:** Explore courses, view details, discover content
**Entry Points:** Direct URL, search engines, social media
**Exit Points:** Login, navigate away, close browser

### Flow Diagram
```
START → Landing Page (/) → Browse Courses → Course Details (/course/:id)
    → View Curriculum (Locked) → Click Enroll → Checkout Page (/checkout/:id)
    → Login Required → FLOW 2
```

---

### Step 1.1: Landing on Storefront

**URL:** `/`
**Route Protection:** None (fully public)
**Component:** `pages/Storefront.tsx`

#### Screen State
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ [Eyebuckz Logo] All Courses  YouTube  [Start Learning]     │
├─────────────────────────────────────────────────────────────┤
│ HERO SECTION (Video Background)                             │
│ "FILM LIKE A MASTER"                                        │
│ [Start Learning Now]  [Watch Trailer]                       │
├─────────────────────────────────────────────────────────────┤
│ SOCIAL PROOF TICKER                                         │
│ 10,000+ Students / 4.9/5 Rating / 50+ Countries             │
├─────────────────────────────────────────────────────────────┤
│ COURSE FILTERS                                              │
│ [ALL] [BUNDLE] [MODULE]                                     │
├─────────────────────────────────────────────────────────────┤
│ COURSE GRID                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │[Image]   │ │[Image]   │ │[Image]   │ │[Image]   │       │
│ │Title     │ │Title     │ │Title     │ │Title     │       │
│ │₹14,999   │ │₹3,499    │ │₹3,999    │ │₹3,999    │       │
│ │⭐ 5.0    │ │⭐ 4.8    │ │⭐ 4.9    │ │⭐ 4.7    │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### User Interactions

| Action | Trigger | Result | Data Loaded |
|--------|---------|--------|-------------|
| Page Load | User visits `/` | Render storefront | `MOCK_COURSES` from constants.ts |
| Scroll | Mouse/touch scroll | Lazy load sections | FAQS, Testimonials, Student Showcase |
| Click Filter "BUNDLE" | Click button | Filter courses | `MOCK_COURSES.filter(c => c.type === 'BUNDLE')` |
| Click Filter "MODULE" | Click button | Filter courses | `MOCK_COURSES.filter(c => c.type === 'MODULE')` |
| Click Filter "ALL" | Click button | Reset filter | Show all `MOCK_COURSES` |
| Click Course Card | Click anywhere on card | Navigate | `navigate('/course/:id')` |
| Click "Start Learning" | Click header button | Trigger auth | Opens login modal (see Flow 2.1) |
| Click "Watch Trailer" | Click hero button | External link | `window.open('https://youtube.com/@eyebuckz')` |

#### State Variables
```typescript
const [filterType, setFilterType] = useState<'ALL' | CourseType>('ALL')
const [openFaq, setOpenFaq] = useState<number | null>(null)
const filteredCourses = filterType === 'ALL'
  ? MOCK_COURSES
  : MOCK_COURSES.filter(c => c.type === filterType)
```

#### Auth Context State
```typescript
user: null  // Guest user
isGapCheckRequired: false
```

---

### Step 1.2: Viewing Course Details

**URL:** `/course/:id` (example: `/course/c1-masterclass`)
**Route Protection:** None (fully public)
**Component:** `pages/CourseDetails.tsx`

#### Screen State
```
┌─────────────────────────────────────────────────────────────┐
│ VIDEO TRAILER (40-60vh)                                      │
│ [Autoplay, Muted, Looping]                          [🔊]    │
│ "Complete Content Creation Masterclass"                     │
│ ⭐ 5.0 | BUNDLE                                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ [OVERVIEW] [CURRICULUM] [REVIEWS]                           │
├─────────────────────────────────────────────────────────────┤
│ Course Overview                                              │
│ A step-by-step content creation masterclass...              │
│                                                              │
│ What you'll learn:                                          │
│ ⚡ 7-Module System                                          │
│ ⚡ Niche Selection Framework                                │
│ ⚡ Monetization Roadmap                                     │
│                                                              │
│ [Enroll for ₹14,999] ← MAIN CTA                            │
└─────────────────────────────────────────────────────────────┘
```

#### Tab Views

**OVERVIEW Tab** (Default)
- Course description (full text)
- "What you'll learn" features list
- Main enrollment CTA button
- Mobile: CTA tracked by IntersectionObserver

**CURRICULUM Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Course Content                            7 Chapters         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 01  Module 1: Selecting Niche...         45:00  [v] │    │
│ │   └─ [Preview Unavailable - Purchase to unlock] 🔒  │    │
│ └─────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 02  Module 2: Creating Scripts...        55:00  [>] │    │
│ │   └─ [Preview Unavailable - Purchase to unlock] 🔒  │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**REVIEWS Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Reviews (2)                                    ⭐ 5.0       │
├─────────────────────────────────────────────────────────────┤
│ [Avatar] Jordan P.                          ⭐⭐⭐⭐⭐     │
│ "Finally a course that covers the BUSINESS side too."       │
│ 3 days ago                                                   │
├─────────────────────────────────────────────────────────────┤
│ [Avatar] Sarah K.                           ⭐⭐⭐⭐⭐     │
│ "The monetization module paid for the course in a week."    │
│ 1 week ago                                                   │
└─────────────────────────────────────────────────────────────┘
```

#### User Interactions

| Action | Trigger | Result | State Change |
|--------|---------|--------|--------------|
| Page Load | Navigate from storefront | Render course details | Load course from `MOCK_COURSES.find(c => c.id === id)` |
| Toggle Mute | Click volume icon | Mute/unmute video | `setIsMuted(!isMuted)` |
| Switch Tab | Click tab button | Show different content | `setActiveTab('CURRICULUM')` |
| Expand Chapter | Click chapter accordion | Show chapter details | `setOpenChapter(chapterId)` |
| Click Locked Module | Click locked chapter | Show tooltip | No state change, display: "Purchase to unlock" |
| Click "Enroll" | Click CTA button | Navigate to checkout | `navigate('/checkout/:id')` |
| Scroll Past CTA | Main CTA scrolls out of view | Show sticky footer CTA | `setShowSticky(true)` via IntersectionObserver |
| Click Browser Back | Back button | Return to storefront | `navigate('/')` |

#### Sticky Footer Logic
```typescript
const mainCtaRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      setShowSticky(!entry.isIntersecting) // Show when CTA not visible
    },
    {
      threshold: 0,
      rootMargin: "-100px 0px 0px 0px"
    }
  )

  if (mainCtaRef.current) {
    observer.observe(mainCtaRef.current)
  }

  return () => observer.disconnect()
}, [])
```

#### Access Control Check
```typescript
// Currently: NO CHECK (fully public)
// TO IMPLEMENT:
const { user } = useAuth()
const hasAccess = enrollmentService.hasAccess(user?.id, course.id)

// If hasAccess:
//   - Show "Go to Course" button instead of "Enroll"
//   - Chapters show ✓ completed or ▶ play icons
// If !hasAccess:
//   - Show "Enroll" button
//   - Chapters show 🔒 locked icons
```

---

### Step 1.3: Attempting to Enroll (Checkout Page)

**URL:** `/checkout/:id`
**Route Protection:** ⚠️ Should require login, currently allows guest view
**Component:** `pages/Checkout.tsx`

#### Screen State (Guest User)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌────────────────────┐ ┌────────────────────────────────┐  │
│ │ ORDER SUMMARY      │ │ SECURE CHECKOUT                │  │
│ │                    │ │                                │  │
│ │ [Thumbnail]        │ │ Full Name                      │  │
│ │ Complete Content   │ │ [________________]             │  │
│ │ Creation...        │ │                                │  │
│ │ BUNDLE             │ │ Email Address                  │  │
│ │                    │ │ [________________]             │  │
│ │ Subtotal: ₹14,999  │ │                                │  │
│ │ Discount: - ₹0     │ │ Phone Number                   │  │
│ │ ───────────────    │ │ [________________]             │  │
│ │ Total: ₹14,999     │ │                                │  │
│ │                    │ │ [Pay ₹14,999]                  │  │
│ │ 🛡️ SSL Secure     │ │                                │  │
│ └────────────────────┘ │ Don't have an account?         │  │
│                        │ We'll create one at checkout   │  │
│                        └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### User Interactions

| Action | Trigger | Result | Next Flow |
|--------|---------|--------|-----------|
| Page Load | Navigate from course details | Render checkout form | Pre-fill if user logged in |
| Fill Form Fields | Type in inputs | Update form state | `setFormData({...})` |
| Click "Pay" (Guest) | Submit form | Trigger login modal | → Flow 2.1 (Login) |
| Click "Pay" (Logged In) | Submit form | Start payment process | → Step 2.3 (Payment) |

#### Form State
```typescript
const [status, setStatus] = useState<
  'IDLE' | 'CREATING_ORDER' | 'PAYING' | 'VERIFYING' | 'SUCCESS'
>('IDLE')

const [formData, setFormData] = useState({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone_e164 || ''
})
```

#### Pre-fill Logic
```typescript
// If user logged in, auto-fill from auth context
useEffect(() => {
  if (user) {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone_e164 || ''
    })
  }
}, [user])
```

#### Auth Check on Submit
```typescript
const handlePayment = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!user) {
    // Guest user → Trigger login first
    await login() // Opens login modal
    return // After login, user will be back here with pre-filled form
  }

  // User logged in → Proceed with payment
  setStatus('CREATING_ORDER')
  // ... continue to payment flow
}
```

---

## Flow 2: New User Registration + Purchase

### Overview
**User Type:** First-time visitor
**Goal:** Create account → Verify phone → Complete purchase → Access content
**Entry Points:** "Start Learning" button, Checkout page
**Success Criteria:** Enrollment created, redirected to dashboard

### Flow Diagram
```
Checkout (Not Logged In) → Click "Pay" → Google OAuth Modal
  → Login Success → Gap Check Modal (Phone) → Phone Verified
  → Return to Checkout → Create Order → Razorpay Payment
  → Webhook Verification → Create Enrollment → Dashboard
```

---

### Step 2.1: Initiating Login

**Trigger:** User clicks "Start Learning" or attempts checkout
**Component:** `context/AuthContext.tsx` + `services/authService.ts`

#### Login Modal (Conceptual - not visible in code, simulated)
```
┌─────────────────────────────────────┐
│          Welcome to Eyebuckz         │
│                                      │
│     [🔵 Continue with Google]       │
│                                      │
│  By continuing, you agree to our    │
│       Terms of Service              │
└─────────────────────────────────────┘
```

#### User Interactions

| Action | Trigger | Result | Duration |
|--------|---------|--------|----------|
| Click "Continue with Google" | Button click | Mock OAuth process | 800ms delay |
| OAuth Processing | Automatic | Server generates user object | Simulated |
| Login Success | Automatic | Update auth context | Immediate |

#### Backend Simulation
```typescript
// authService.login()
export const authService = {
  login: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: 'u_123',
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: 'https://images.unsplash.com/.../w=200',
          role: 'USER',
          google_id: 'g_12345',
          // phone_e164 intentionally undefined → Triggers Gap Check
        }

        // Generate session token
        const newToken = `token_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`

        // Server-side session store (mock)
        MOCK_SERVER_SESSION_STORE[mockUser.id] = newToken

        // Client-side storage
        localStorage.setItem(SESSION_TOKEN_KEY, newToken)

        resolve(mockUser)
      }, 800) // Simulate network delay
    })
  }
}
```

#### Auth Context Update
```typescript
const login = async () => {
  const loggedInUser = await authService.login()
  setUser(loggedInUser)
  authService.saveSession(loggedInUser)

  // Check if phone number missing
  if (!loggedInUser.phone_e164) {
    setIsGapCheckRequired(true) // Triggers Gap Check Modal
  }
}
```

#### localStorage Changes
```typescript
Before Login:
  eyebuckz_user: null
  eyebuckz_session_token: null

After Login:
  eyebuckz_user: '{"id":"u_123","name":"Demo User",...}'
  eyebuckz_session_token: 'token_1704441234567_x8k2p9'
```

---

### Step 2.2: Gap Check - Phone Number Verification

**Trigger:** `user.phone_e164 === undefined`
**Component:** `components/GapCheckModal.tsx`
**Blocking:** Full-screen modal, cannot be dismissed except by logout

#### Screen State
```
┌─────────────────────────────────────────────────────────────┐
│                    🔒                                        │
│              Final Step Required                             │
│                                                              │
│  To ensure account security and enable 2FA recovery,        │
│  Eyebuckz requires a verified mobile number for all         │
│  premium accounts.                                           │
│                                                              │
│  Mobile Number (E.164 Format)                               │
│  📞 [+15550000000________________]                          │
│      Format: +[CountryCode][Number] without spaces.         │
│                                                              │
│  [Secure Account & Continue]                                │
│                                                              │
│  Logout & Return to Home                                    │
└─────────────────────────────────────────────────────────────┘
```

#### User Interactions - Success Path

| Step | Action | Input Example | Validation | Result |
|------|--------|---------------|------------|--------|
| 1 | Type phone number | `+15551234567` | Regex: `/^\+[1-9]\d{1,14}$/` | ✅ Valid |
| 2 | Click "Secure Account" | Button click | Check E.164 format | ✅ Pass |
| 3 | Server validation | API call (500ms) | Mock validation | ✅ Success |
| 4 | Update user object | Automatic | Merge phone into user | `user.phone_e164 = "+15551234567"` |
| 5 | Close modal | Automatic | Set flag false | `isGapCheckRequired = false` |
| 6 | Return to previous page | Automatic | Navigate back | Resume checkout flow |

#### User Interactions - Error Path

| Step | Action | Input Example | Validation | Result |
|------|--------|---------------|------------|--------|
| 1 | Type invalid phone | `1234567890` | Regex check | ❌ Missing + prefix |
| 2 | Click submit | Button click | Validation fails | Error displayed |
| 3 | Error message | Automatic | Red text below input | "Please enter a valid E.164 number..." |
| 4 | User corrects | `+1234567890` | Retry validation | ❌ Still invalid (missing digit) |
| 5 | Show error again | Automatic | Persistent error | User must fix |

#### User Interactions - Logout Path

| Step | Action | Result |
|------|--------|--------|
| 1 | Click "Logout & Return to Home" | Trigger logout |
| 2 | Clear session | Remove from localStorage | `eyebuckz_user`, `eyebuckz_session_token` deleted |
| 3 | Close modal | Automatic | `isGapCheckRequired = false` |
| 4 | Redirect | Navigate to `/` | Return to storefront as guest |

#### Validation Logic
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  // E.164 Validation
  const e164Regex = /^\+[1-9]\d{1,14}$/

  if (!e164Regex.test(phone)) {
    setError('Please enter a valid E.164 number (e.g., +15550000000).')
    return
  }

  setIsSubmitting(true)

  try {
    await updatePhoneNumber(phone)
    // Success: Modal auto-closes, user proceeds
  } catch (err) {
    setError('Failed to update. Ensure format is correct.')
  } finally {
    setIsSubmitting(false)
  }
}
```

#### Server Simulation
```typescript
updatePhone: async (userId: string, phone: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const e164Regex = /^\+[1-9]\d{1,14}$/
      if (e164Regex.test(phone)) {
        resolve() // Success
      } else {
        reject(new Error("Invalid E.164 format"))
      }
    }, 500) // Simulate API delay
  })
}
```

#### Context Update
```typescript
const updatePhoneNumber = async (phone: string) => {
  if (user) {
    await authService.updatePhone(user.id, phone)

    // Update user object
    const updatedUser = { ...user, phone_e164: phone }
    setUser(updatedUser)
    authService.saveSession(updatedUser)

    // Close modal
    setIsGapCheckRequired(false)
  }
}
```

#### localStorage Changes
```typescript
Before Phone Update:
  eyebuckz_user: '{"id":"u_123",...,"phone_e164":undefined}'

After Phone Update:
  eyebuckz_user: '{"id":"u_123",...,"phone_e164":"+15551234567"}'
```

---

### Step 2.3: Completing Payment

**URL:** `/checkout/:id`
**User State:** Logged in, phone verified
**Component:** `pages/Checkout.tsx`

#### Screen State (Authenticated User)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌────────────────────┐ ┌────────────────────────────────┐  │
│ │ ORDER SUMMARY      │ │ SECURE CHECKOUT                │  │
│ │                    │ │                                │  │
│ │ [Thumbnail]        │ │ Full Name                      │  │
│ │ Complete Content   │ │ [Demo User________] ← PRE-FILLED│  │
│ │ Creation...        │ │                                │  │
│ │ BUNDLE             │ │ Email Address                  │  │
│ │                    │ │ [demo@example.com_] ← PRE-FILLED│  │
│ │ Subtotal: ₹14,999  │ │                                │  │
│ │ Discount: - ₹0     │ │ Phone Number                   │  │
│ │ ───────────────    │ │ [+15551234567_____] ← LOCKED   │  │
│ │ Total: ₹14,999     │ │                                │  │
│ │                    │ │ [Pay ₹14,999]                  │  │
│ │ 🛡️ SSL Secure     │ └────────────────────────────────┘  │
│ └────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

#### Payment State Machine

```
IDLE → CREATING_ORDER → PAYING → VERIFYING → SUCCESS
  ↓         ↓             ↓         ↓           ↓
  Pay    Create Order  Razorpay  Webhook   Redirect
Button   API Call      Modal     Check     Dashboard
```

#### Detailed Payment Flow

**Phase 1: Create Order** (Status: `CREATING_ORDER`)

| Step | Action | Duration | API Call | Response |
|------|--------|----------|----------|----------|
| 1 | User clicks "Pay ₹14,999" | Immediate | None | Button disabled, spinner |
| 2 | Button text changes | Immediate | None | "Creating Order..." |
| 3 | Mock API call | 1000ms | `POST /api/checkout/create-order` | `{orderId: "order_xyz123"}` |
| 4 | Transition to next phase | Immediate | None | Status → `PAYING` |

```typescript
setStatus('CREATING_ORDER')
setTimeout(() => {
  // Simulate: POST /api/checkout/create-order
  // Payload: { userId: user.id, courseId: course.id, amount: 14999 }
  // Response: { orderId: "order_xyz123", currency: "INR" }

  setStatus('PAYING')
}, 1000)
```

**Phase 2: Razorpay Payment** (Status: `PAYING`)

| Step | Action | Duration | What Happens |
|------|--------|----------|--------------|
| 1 | Button text changes | Immediate | "Processing Razorpay..." |
| 2 | Open Razorpay modal | 2000ms | Simulated payment gateway |
| 3 | User completes payment | Simulated | Razorpay returns success |
| 4 | Payment captured | Immediate | Trigger webhook event |
| 5 | Transition to verification | Immediate | Status → `VERIFYING` |

```typescript
setStatus('PAYING')
setTimeout(() => {
  // Simulate: Razorpay Standard Checkout
  // const razorpay = new Razorpay({
  //   order_id: "order_xyz123",
  //   handler: (response) => {
  //     // Razorpay sends payment_id, order_id, signature
  //   }
  // })
  // razorpay.open()

  setStatus('VERIFYING')
}, 2000)
```

**Phase 3: Webhook Verification** (Status: `VERIFYING`)

| Step | Action | Duration | API Call | Response |
|------|--------|----------|----------|----------|
| 1 | Button text changes | Immediate | None | "Verifying Webhook..." |
| 2 | Server receives webhook | 1500ms | `POST /api/webhooks/razorpay` | Event: `payment.captured` |
| 3 | Verify signature | 500ms | Server-side | HMAC signature check |
| 4 | Create enrollment | 500ms | `POST /api/enrollments` | `{enrollmentId: "enr_456"}` |
| 5 | Transition to success | Immediate | None | Status → `SUCCESS` |

```typescript
setStatus('VERIFYING')
setTimeout(() => {
  // Simulate: POST /api/webhooks/razorpay
  // Headers: { 'x-razorpay-signature': 'abc123...' }
  // Body: {
  //   event: 'payment.captured',
  //   payload: {
  //     payment: { id, order_id, amount, status: 'captured' }
  //   }
  // }

  // Server verifies:
  // const expectedSignature = crypto
  //   .createHmac('sha256', webhookSecret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex')
  // if (expectedSignature === receivedSignature) { /* valid */ }

  // Server creates enrollment:
  // await db.enrollments.create({
  //   userId: user.id,
  //   courseId: course.id,
  //   enrolledAt: new Date(),
  //   paymentId: payment.id
  // })

  setStatus('SUCCESS')
}, 1500)
```

**Phase 4: Success** (Status: `SUCCESS`)

| Step | Action | Duration | Result |
|------|--------|----------|--------|
| 1 | Show success overlay | Immediate | Full-screen animation |
| 2 | Display checkmark + message | Immediate | "Payment Successful!" |
| 3 | Auto-redirect | 1500ms | Navigate to `/dashboard` |

```typescript
setStatus('SUCCESS')
setTimeout(() => {
  navigate('/dashboard')
}, 1500)
```

#### Success Overlay
```
┌─────────────────────────────────────┐
│                                      │
│             ✅                       │
│                                      │
│      Payment Successful!             │
│                                      │
│   Redirecting to your studio...     │
│                                      │
└─────────────────────────────────────┘
```

#### Critical Missing Implementation

**⚠️ ENROLLMENT CREATION NOT IMPLEMENTED**

```typescript
// TO IMPLEMENT: After webhook verification
const enrollmentData = {
  userId: user.id,
  courseId: course.id,
  enrolledAt: new Date().toISOString(),
  paymentId: razorpayPaymentId,
  orderId: razorpayOrderId,
  amount: course.price,
  progress: {
    completedModules: [],
    currentModule: null,
    overallPercent: 0
  }
}

// Option 1: localStorage (MVP)
const enrollments = JSON.parse(
  localStorage.getItem('eyebuckz_enrollments') || '[]'
)
enrollments.push(enrollmentData)
localStorage.setItem('eyebuckz_enrollments', JSON.stringify(enrollments))

// Option 2: Backend API (Production)
await fetch('/api/enrollments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(enrollmentData)
})
```

#### Error Handling

| Error Type | Trigger | UI Response | User Action |
|------------|---------|-------------|-------------|
| Network Error | API timeout | "Connection failed. Retry?" | Retry button |
| Payment Failed | Razorpay decline | "Payment declined. Try again?" | New attempt |
| Webhook Timeout | Server delay | "Verification pending..." | Wait + refresh |
| Invalid Signature | Security error | "Payment verification failed" | Contact support |
| Duplicate Payment | Already enrolled | "You already own this course" | Redirect to `/learn/:id` |

---

### Step 2.4: Landing on Dashboard

**URL:** `/dashboard`
**Route Protection:** Requires login (`user !== null`)
**Component:** `pages/Dashboard.tsx`

#### Screen State (First Purchase)
```
┌─────────────────────────────────────────────────────────────┐
│ My Studio                                                    │
│ Welcome back, Demo User                                      │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐      │
│ │ [Thumbnail Image]                                  │      │
│ │ ▶️ (play icon on hover)                            │      │
│ ├────────────────────────────────────────────────────┤      │
│ │ Complete Content Creation Masterclass              │      │
│ │                                                     │      │
│ │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░ 35%                        │      │
│ │ 35% Completed                                      │      │
│ │                                                     │      │
│ │ [Resume Editing]                                   │      │
│ └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### Current Implementation (Hardcoded)
```typescript
// ⚠️ INCORRECT: Currently hardcoded
const myCourses = [MOCK_COURSES[0]] // Always shows first course
```

#### Expected Implementation
```typescript
// ✅ CORRECT: Should query enrollments
const { user } = useAuth()
const [enrollments, setEnrollments] = useState([])

useEffect(() => {
  const loadEnrollments = async () => {
    // Option 1: localStorage
    const stored = localStorage.getItem('eyebuckz_enrollments')
    const allEnrollments = JSON.parse(stored || '[]')
    const userEnrollments = allEnrollments.filter(
      e => e.userId === user.id
    )

    // Map to course details
    const myCourses = userEnrollments.map(enrollment => {
      const course = MOCK_COURSES.find(c => c.id === enrollment.courseId)
      return {
        ...course,
        progress: enrollment.progress.overallPercent,
        enrolledAt: enrollment.enrolledAt
      }
    })

    setEnrollments(myCourses)

    // Option 2: Backend API (Production)
    // const response = await fetch(`/api/enrollments/${user.id}`)
    // const data = await response.json()
    // setEnrollments(data)
  }

  if (user) loadEnrollments()
}, [user])
```

#### User Interactions

| Action | Trigger | Result | Navigation |
|--------|---------|--------|------------|
| View Dashboard | Navigate from checkout | Load enrolled courses | Display course cards |
| Hover Card | Mouse over | Play icon appears | Visual feedback |
| Click "Resume Editing" | Button click | Navigate to learn page | `/learn/:id` |
| Click "Browse Catalog" | Link in empty state | Return to storefront | `/` |

#### Empty State
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│              📚                                              │
│                                                              │
│   You haven't enrolled in any masterclasses yet.            │
│                                                              │
│             [Browse Catalog]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 3: Enrolled User Learning Experience

### Overview
**User Type:** Authenticated user with active enrollment
**Goal:** Watch videos, complete modules, track progress
**Entry Points:** Dashboard "Resume Editing" button
**Success Criteria:** Module completion, progress saved

### Flow Diagram
```
Dashboard → Click Resume → /learn/:id (Access Check)
  → Video Player Loads → Watch Video → Progress Auto-Save (30s)
  → Module Complete (95%) → Mark Complete → Update Progress
  → Next Module → Repeat
```

---

### Step 3.1: Entering Learn Page

**URL:** `/learn/:id`
**Route Protection:** ⚠️ Should require enrollment, currently no check
**Component:** `pages/Learn.tsx`

#### Expected Access Control
```typescript
// TO IMPLEMENT
const { user } = useAuth()
const { id } = useParams<{ id: string }>()
const [hasAccess, setHasAccess] = useState(false)
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const checkAccess = async () => {
    if (!user) {
      navigate('/') // Not logged in
      return
    }

    // Check enrollment
    const enrolled = await enrollmentService.hasAccess(user.id, id)

    if (!enrolled) {
      // Show "Purchase Required" modal
      alert('You need to purchase this course')
      navigate(`/checkout/${id}`)
      return
    }

    setHasAccess(true)
    setIsLoading(false)
  }

  checkAccess()
}, [user, id])

if (isLoading) return <LoadingSpinner />
if (!hasAccess) return null
```

#### Screen State
```
┌─────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────┐ ┌────────────────────────┐   │
│ │ VIDEO PLAYER (70%)        │ │ SIDEBAR (30%)          │   │
│ │                           │ │                        │   │
│ │                           │ │ Complete Content...    │   │
│ │                           │ │ ◉ 35% Complete         │   │
│ │       [▶️ Play]           │ │                        │   │
│ │                           │ │ ✓ Module 1 (45:00)     │   │
│ │                           │ │ ○ Module 2 (55:00) ←   │   │
│ │                           │ │ ○ Module 3 (60:00)     │   │
│ │                           │ │ ○ Module 4 (90:00)     │   │
│ │ ━━━━━━━━━━━░░░░░░░░░     │ │ ○ Module 5 (40:00)     │   │
│ │ [⏮] [▶/⏸] [⏭] 15:30/55:00│ │ ○ Module 6 (35:00)     │   │
│ │ [🔊] [⚙ 1080p] [⛶]       │ │ ○ Module 7 (25:00)     │   │
│ └───────────────────────────┘ │                        │   │
│                                │ 📝 NOTES               │   │
│                                │ ┌──────────────────┐   │   │
│                                │ │ Type your notes  │   │   │
│                                │ │ here...          │   │   │
│                                │ └──────────────────┘   │   │
│                                └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 3.2: Video Player Interactions

#### Player Controls

| Control | Icon | Action | Result |
|---------|------|--------|--------|
| Play/Pause | ▶️/⏸ | Toggle playback | Start/stop video, update `isPlaying` |
| Previous | ⏮ | Go to prev module | Load previous video, reset timestamp |
| Next | ⏭ | Go to next module | Load next video, reset timestamp |
| Seek Bar | ━━━░░░░ | Drag or click | Jump to timestamp |
| Volume | 🔊 | Hover + slider | Adjust volume 0-100% |
| Mute | 🔇 | Toggle mute | Mute/unmute audio |
| Quality | ⚙ 1080p | Dropdown | Switch 1080p/720p/480p |
| Fullscreen | ⛶ | Toggle | Enter/exit fullscreen |

#### Player State Variables
```typescript
const [activeChapterId, setActiveChapterId] = useState(course?.chapters[0].id)
const [isPlaying, setIsPlaying] = useState(false)
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)
const [volume, setVolume] = useState(1)
const [isMuted, setIsMuted] = useState(false)
const [showControls, setShowControls] = useState(true)
const [quality, setQuality] = useState('1080p')
const [notes, setNotes] = useState('')

const videoRef = useRef<HTMLVideoElement>(null)
```

#### Keyboard Shortcuts

| Key | Action | Function |
|-----|--------|----------|
| Space | Play/Pause | Toggle `videoRef.current.paused` |
| → | Seek Forward | `currentTime += 10` |
| ← | Seek Backward | `currentTime -= 10` |
| ↑ | Volume Up | `volume = Math.min(1, volume + 0.1)` |
| ↓ | Volume Down | `volume = Math.max(0, volume - 0.1)` |
| M | Mute | Toggle mute |
| F | Fullscreen | Toggle fullscreen |

---

### Step 3.3: Progress Tracking System

#### Auto-Save Mechanism
```typescript
// Save progress every 30 seconds while playing
useEffect(() => {
  const saveProgress = () => {
    if (!videoRef.current) return
    const timestamp = Math.floor(videoRef.current.currentTime)

    console.log(`[Server Mock] Saving progress for user_${user.id}, video_${activeChapterId}: ${timestamp}s`)

    // TO IMPLEMENT: API call
    // await fetch('/api/progress', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     userId: user.id,
    //     courseId: course.id,
    //     moduleId: activeChapterId,
    //     timestamp: timestamp,
    //     completed: false
    //   })
    // })
  }

  const interval = setInterval(() => {
    if (isPlaying) saveProgress()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [isPlaying, activeChapterId])
```

#### Module Completion Logic
```typescript
// Mark module complete when reaching 95%
const handleTimeUpdate = () => {
  if (!videoRef.current) return

  const current = videoRef.current.currentTime
  const total = videoRef.current.duration
  setCurrentTime(current)
  setDuration(total)

  // Check if 95% complete
  if (current / total >= 0.95 && !isModuleComplete(activeChapterId)) {
    markModuleComplete(activeChapterId)
  }
}

const markModuleComplete = async (moduleId: string) => {
  // TO IMPLEMENT: Update enrollment progress
  // await fetch('/api/progress', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     userId: user.id,
  //     moduleId: moduleId,
  //     completed: true,
  //     completedAt: new Date().toISOString()
  //   })
  // })

  // Update local state
  const updatedChapters = course.chapters.map(ch =>
    ch.id === moduleId ? { ...ch, isCompleted: true } : ch
  )

  // Show completion animation
  showCompletionToast(`✓ ${moduleName} completed!`)

  // Auto-advance after 3s
  setTimeout(() => {
    if (hasNextModule) {
      setActiveChapterId(nextModuleId)
    }
  }, 3000)
}
```

#### Progress Data Structure
```typescript
interface ProgressData {
  userId: string
  courseId: string
  modules: {
    moduleId: string
    lastTimestamp: number // seconds
    completed: boolean
    completedAt: string | null
    watchTime: number // total seconds watched
  }[]
  overallProgress: number // 0-100
  lastAccessedAt: string
}
```

#### Resume from Last Position
```typescript
// On component mount, load saved progress
useEffect(() => {
  const loadProgress = async () => {
    // TO IMPLEMENT: Fetch from API
    // const response = await fetch(`/api/progress/${user.id}/${course.id}`)
    // const data = await response.json()

    // Option 1: localStorage (MVP)
    const stored = localStorage.getItem(`eyebuckz_progress_${user.id}_${course.id}`)
    const progress = JSON.parse(stored || '{}')

    if (progress.lastModule) {
      // Show "Resume" dialog
      const shouldResume = window.confirm(
        `Resume from Module ${progress.lastModule.title} at ${formatTime(progress.lastModule.timestamp)}?`
      )

      if (shouldResume) {
        setActiveChapterId(progress.lastModule.id)
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = progress.lastModule.timestamp
          }
        }, 100)
      }
    }
  }

  loadProgress()
}, [])
```

---

### Step 3.4: Sidebar Module Navigation

#### Module List State

| Icon | State | Meaning | Clickable |
|------|-------|---------|-----------|
| ✓ | Completed | Module watched to 95%+ | Yes |
| ○ | Not Started | Never accessed | Yes |
| ▶ | In Progress | Started but not complete | Yes |
| → | Current | Currently playing | No |

#### User Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Click Module | Click module item | Switch to that module, pause current video |
| Scroll List | Mouse/touch scroll | Scroll through all modules |
| View Progress Ring | Visual indicator | Shows overall course completion % |

#### Module Click Handler
```typescript
const handleModuleClick = (moduleId: string) => {
  // Save current progress before switching
  if (videoRef.current) {
    saveProgress(activeChapterId, videoRef.current.currentTime)
  }

  // Switch to new module
  setActiveChapterId(moduleId)
  setIsPlaying(false) // Pause on switch

  // Update last accessed module
  localStorage.setItem(`eyebuckz_last_module_${course.id}`, moduleId)
}
```

---

### Step 3.5: Notes Feature

#### Notes UI
```
┌──────────────────────────────┐
│ 📝 NOTES                     │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ Key insight: 180-degree  │ │
│ │ rule ensures spatial     │ │
│ │ consistency...           │ │
│ │                          │ │
│ │ [Cursor blinking]        │ │
│ │                          │ │
│ └──────────────────────────┘ │
│ Auto-saved 2 minutes ago     │
└──────────────────────────────┘
```

#### Notes Functionality

| Action | Trigger | Storage | Auto-Save |
|--------|---------|---------|-----------|
| Type | Keyboard input | Per-module | After 2s idle |
| Switch Module | Click another module | Load module notes | Save current first |
| Export | Download button | Generate .txt | Immediate |

#### Notes Storage
```typescript
// localStorage key per module
const NOTES_KEY = `eyebuckz_notes_${user.id}_${activeChapterId}`

// Auto-save after 2 seconds of no typing
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem(NOTES_KEY, notes)
    // Show "Saved" indicator
  }, 2000)

  return () => clearTimeout(timer)
}, [notes])

// Load notes when switching modules
useEffect(() => {
  const savedNotes = localStorage.getItem(NOTES_KEY) || ''
  setNotes(savedNotes)
}, [activeChapterId])
```

---

### Step 3.6: Security Features

#### Right-Click Protection
```typescript
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault() // Disable right-click
  }
  document.addEventListener('contextmenu', handleContextMenu)

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu)
  }
}, [])
```

#### DevTools Detection (Future Enhancement)
```typescript
// TO IMPLEMENT: Detect if DevTools open
// Pause video if developer console detected
```

#### Video URL Protection (Future Enhancement)
```typescript
// TO IMPLEMENT: Signed URLs with expiry
// const videoUrl = await getSignedUrl({
//   courseId: course.id,
//   moduleId: activeChapterId,
//   userId: user.id,
//   expiresIn: 3600 // 1 hour
// })
// videoRef.current.src = videoUrl
```

---

### Step 3.7: Course Completion

**Trigger:** All modules marked complete (100% progress)

#### Completion Modal
```
┌─────────────────────────────────────────────────────────────┐
│                  🎉 Congratulations! 🎉                      │
│                                                              │
│         You've completed the course!                         │
│         "Complete Content Creation Masterclass"              │
│                                                              │
│         ┌──────────────────────────────┐                    │
│         │   [Certificate Preview]      │                    │
│         │                              │                    │
│         │   This certifies that        │                    │
│         │   Demo User                  │                    │
│         │   has successfully completed │                    │
│         │   ...                        │                    │
│         └──────────────────────────────┘                    │
│                                                              │
│   [Download Certificate]  [Share on LinkedIn]               │
│                                                              │
│   [Continue Exploring]                                       │
└─────────────────────────────────────────────────────────────┘
```

#### Actions

| Button | Action | Result |
|--------|--------|--------|
| Download Certificate | Generate PDF | Download certificate.pdf |
| Share on LinkedIn | Open LinkedIn | Pre-filled post with certificate |
| Continue Exploring | Close modal | Return to dashboard |

#### Certificate Data
```typescript
interface Certificate {
  id: string
  userId: string
  courseId: string
  courseTitle: string
  studentName: string
  issueDate: string
  completionDate: string
  certificateNumber: string
  downloadUrl: string
}
```

---

## Flow 4: Returning User Session

### Overview
**User Type:** Previously logged in user
**Goal:** Resume learning seamlessly
**Entry Points:** Any page load with stored session
**Session Duration:** Persistent until logout or concurrent login

---

### Step 4.1: Auto-Login on Page Load

**Trigger:** User visits site (any page)
**Process:** AuthContext checks localStorage on mount

#### Auto-Login Flow
```typescript
// AuthContext.tsx - useEffect on mount
useEffect(() => {
  const storedUser = authService.checkSession()

  if (storedUser) {
    setUser(storedUser)

    // Check if Gap Check required
    if (!storedUser.phone_e164) {
      setIsGapCheckRequired(true)
    }
  }
}, [])

// authService.ts
export const authService = {
  checkSession: (): User | null => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  }
}
```

#### localStorage Check
```typescript
// On page load
const sessionData = {
  user: localStorage.getItem('eyebuckz_user'),
  token: localStorage.getItem('eyebuckz_session_token')
}

if (sessionData.user && sessionData.token) {
  // Valid session found
  setUser(JSON.parse(sessionData.user))
  // Update header, show "My Learning" link
}
```

#### Navigation Updates

**Before Auto-Login (Guest State):**
```
Header: [Eyebuckz] All Courses | YouTube | [Start Learning]
```

**After Auto-Login (Authenticated State):**
```
Header: [Eyebuckz] All Courses | YouTube | My Learning | [Avatar] [Logout]
```

---

### Step 4.2: Concurrent Session Detection

**Background Process:** Polls server every 10 seconds to validate session token

#### Session Validation Flow
```typescript
// AuthContext.tsx - Concurrent session check
useEffect(() => {
  if (!user) return

  const intervalId = setInterval(async () => {
    const isValid = await authService.validateSessionToken(user.id)

    if (!isValid) {
      alert('You have been logged out because your account was accessed from another device.')
      logout()
    }
  }, 10000) // Check every 10 seconds

  return () => clearInterval(intervalId)
}, [user])
```

#### Server-Side Session Store (Mock)
```typescript
// authService.ts
let MOCK_SERVER_SESSION_STORE: Record<string, string> = {}
// Structure: { userId: "latestValidToken" }

validateSessionToken: async (userId: string): Promise<boolean> => {
  const currentClientToken = localStorage.getItem(SESSION_TOKEN_KEY)
  const validServerToken = MOCK_SERVER_SESSION_STORE[userId]

  // If server token doesn't match client token, session is invalid
  if (validServerToken && currentClientToken !== validServerToken) {
    return false // Concurrent login detected
  }

  return true // Session valid
}
```

#### Concurrent Login Scenario

| Step | Device A | Device B | Server State |
|------|----------|----------|--------------|
| 1 | Login at 10:00 AM | - | `{u_123: "token_A"}` |
| 2 | Using platform normally | - | Token A valid |
| 3 | - | Login at 10:05 AM | `{u_123: "token_B"}` ← Updated |
| 4 | Poll at 10:05:10 | - | Token A ≠ token_B → Invalid |
| 5 | Force logout + alert | Using normally | Device B continues |

---

### Step 4.3: Resume Learning from Dashboard

**URL:** `/dashboard`
**User State:** Authenticated, has enrollments

#### Resume Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Resume Learning?                                             │
│                                                              │
│ You were last watching:                                      │
│ Module 2: Creating Scripts... at 15:30                       │
│                                                              │
│ [Resume]  [Start Over]                                       │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation
```typescript
// On /learn/:id page load
useEffect(() => {
  const loadLastPosition = async () => {
    const progress = await getProgress(user.id, course.id)

    if (progress.lastModule && progress.lastModule.timestamp > 0) {
      const shouldResume = window.confirm(
        `Resume from Module ${progress.lastModule.title} at ${formatTime(progress.lastModule.timestamp)}?`
      )

      if (shouldResume) {
        // Load module
        setActiveChapterId(progress.lastModule.id)

        // Seek to timestamp
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = progress.lastModule.timestamp
          }
        }, 100)
      } else {
        // Start from beginning
        setActiveChapterId(course.chapters[0].id)
      }
    }
  }

  loadLastPosition()
}, [course.id])
```

---

## Flow 5: Admin User Management

### Overview
**User Type:** Admin (role: 'ADMIN')
**Goal:** Manage platform, view analytics, control content
**Access:** Admin panel at `/admin`

---

### Step 5.1: Admin Login

**Trigger:** Admin uses special login (hidden button or direct call)

#### Admin Login Process
```typescript
// authService.ts
adminLogin: async (): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const adminUser: User = {
        id: 'admin_1',
        name: 'Admin User',
        email: 'admin@eyebuckz.com',
        phone_e164: '+1234567890', // Pre-verified
        avatar: 'https://images.unsplash.com/.../w=200',
        role: 'ADMIN' // ← Key difference
      }

      const newToken = `token_${Date.now()}_admin`
      MOCK_SERVER_SESSION_STORE[adminUser.id] = newToken
      localStorage.setItem(SESSION_TOKEN_KEY, newToken)

      resolve(adminUser)
    }, 500)
  })
}
```

#### Header Changes (Admin View)
```
Header: [Eyebuckz] All Courses | YouTube | My Learning | 🛡️ Admin | [Avatar] [Logout]
                                                          ↑ Red badge
```

---

### Step 5.2: Admin Dashboard

**URL:** `/admin`
**Access Control:**
```typescript
if (user?.role !== 'ADMIN') {
  return (
    <div>
      <h1>Access Denied</h1>
      <p>You do not have permission to view this area.</p>
      <Link to="/">Return Home</Link>
    </div>
  )
}
```

#### Admin Panel Tabs
```
┌─────────────────────────────────────────────────────────────┐
│ Admin Portal                                                 │
│ Platform Management                                          │
│                                                              │
│ [DASHBOARD] [COURSES] [USERS] [CERTIFICATES]                │
├─────────────────────────────────────────────────────────────┤
│ (Tab content below)                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Tab 1: Dashboard (Analytics)

#### Stats Cards
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Sales  │ │ Active       │ │ Total        │ │ Certificates │
│ 💵          │ │ Learners     │ │ Courses      │ │ 🏆          │
│ ₹1.2L        │ │ 👥          │ │ 📚          │ │ 128          │
│ +12% ↗      │ │ 842          │ │ 4            │ │ Issued       │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### Sales Chart (Recharts)
```
┌─────────────────────────────────────────────────────────────┐
│ Sales Performance                                            │
│                                                              │
│ ₹50k ┤                              ╭─╮                     │
│      │                          ╭───╯ ╰╮                    │
│ ₹40k ┤                     ╭────╯      ╰╮                   │
│      │                ╭────╯             ╰╮                  │
│ ₹30k ┤           ╭────╯                  ╰────╮             │
│      │      ╭────╯                             ╰───╮         │
│ ₹20k ┤──────╯                                      ╰─────   │
│      └────────────────────────────────────────────────────  │
│      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct       │
└─────────────────────────────────────────────────────────────┘
```

#### Data Source
```typescript
// constants.ts
export const MOCK_SALES_DATA: SalesData[] = [
  { date: 'Jan', amount: 25000 },
  { date: 'Feb', amount: 32000 },
  { date: 'Mar', amount: 38000 },
  // ...
]
```

---

### Tab 2: Courses (CRUD)

#### Course Table
```
┌─────────────────────────────────────────────────────────────┐
│ Course Manager                            [+ New Course]     │
├──────────────────────────┬────────┬─────────┬──────────┬────┤
│ COURSE TITLE             │ STATUS │ PRICE   │ ENROLLED │    │
├──────────────────────────┼────────┼─────────┼──────────┼────┤
│ Complete Content...      │ 🟢 PUB │ ₹14,999 │ 4,200    │ ED │
│ Content Selection...     │ 🟢 PUB │ ₹3,499  │ 0        │ ED │
│ Fundamentals of Cine...  │ 🟢 PUB │ ₹3,999  │ 0        │ ED │
│ Creator Focused Edit...  │ 🟢 PUB │ ₹3,999  │ 0        │ ED │
└──────────────────────────┴────────┴─────────┴──────────┴────┘
```

#### Actions

| Button | Action | Result |
|--------|--------|--------|
| + New Course | Open form modal | Create new course |
| Edit (ED) | Open edit modal | Modify course details |
| Delete | Confirmation dialog | Remove course |
| Status Toggle | Publish/Unpublish | Change status |

#### Create Course Modal (Conceptual)
```
┌─────────────────────────────────────┐
│ Create New Course                    │
├─────────────────────────────────────┤
│ Title: [_______________]             │
│ Description: [_______________]       │
│ Price: [₹__________]                │
│ Type: ( ) Bundle (•) Module          │
│ Status: ( ) Published (•) Draft      │
│                                      │
│ Modules:                             │
│ [+ Add Module]                       │
│                                      │
│ [Cancel]  [Create Course]            │
└─────────────────────────────────────┘
```

---

### Tab 3: Users

#### User Table
```
┌─────────────────────────────────────────────────────────────┐
│ User Management                          [Search: _____]     │
├─────────────┬──────────────────┬────────┬──────────────┬────┤
│ NAME        │ EMAIL            │ ROLE   │ ENROLLED     │    │
├─────────────┼──────────────────┼────────┼──────────────┼────┤
│ Demo User   │ demo@example.com │ USER   │ 1 course     │ BA │
│ John Doe    │ john@example.com │ USER   │ 0 courses    │ BA │
│ Admin User  │ admin@eyebuckz..│ ADMIN  │ All access   │ -  │
└─────────────┴──────────────────┴────────┴──────────────┴────┘
```

#### Admin Actions

| Button | Action | Result |
|--------|--------|--------|
| Ban (BA) | Disable user account | User cannot login |
| Upgrade to Admin | Change role | Grant admin access |
| Manual Enroll | Assign course | Give free access |
| View Details | Open user profile | Show full activity |

---

### Tab 4: Certificates

#### Certificate List
```
┌─────────────────────────────────────────────────────────────┐
│ Certificate Management                   [Generate New]      │
├────────────┬───────────────────────┬─────────────┬──────────┤
│ STUDENT    │ COURSE                │ ISSUE DATE  │ ACTIONS  │
├────────────┼───────────────────────┼─────────────┼──────────┤
│ Sarah K.   │ Complete Content...   │ 2025-12-15  │ DL  RV   │
│ Marcus C.  │ Cinematography        │ 2025-12-10  │ DL  RV   │
│ Emily W.   │ Editing Workflow      │ 2025-12-08  │ DL  RV   │
└────────────┴───────────────────────┴─────────────┴──────────┘
```

#### Certificate Actions

| Button | Action | Result |
|--------|--------|--------|
| Download (DL) | Generate PDF | Download certificate |
| Revoke (RV) | Invalidate | Mark as revoked |
| Generate New | Manual issue | Create for specific user |

---

## Edge Cases & Error Handling

### Authentication Errors

| Scenario | Detection | User Experience | Recovery |
|----------|-----------|-----------------|----------|
| OAuth Timeout | API timeout (>10s) | "Login failed. Try again?" | Retry button |
| Invalid Session | validateSessionToken returns false | Alert + force logout | Re-login required |
| Expired Token | API 401 response | "Session expired. Please login." | Redirect to login |
| Network Offline | fetch() fails | "No connection. Retrying..." | Auto-retry with backoff |

### Payment Errors

| Scenario | Detection | User Experience | Recovery |
|----------|-----------|-----------------|----------|
| Payment Declined | Razorpay error | "Payment failed. Try again?" | Retry with different method |
| Webhook Timeout | No response in 30s | "Processing... Please wait" | Background verification |
| Duplicate Payment | Already enrolled check | "You already own this course" | Redirect to /learn/:id |
| Amount Mismatch | Server validation | "Price has changed. Refresh?" | Reload checkout |

### Video Player Errors

| Scenario | Detection | User Experience | Recovery |
|----------|-----------|-----------------|----------|
| Video Load Failure | onerror event | "Failed to load video" | Retry button |
| Network Interruption | stalled event | "Buffering..." | Auto-resume when online |
| Unsupported Format | canplay = false | "Format not supported" | Provide alternative format |
| Seek Beyond Duration | currentTime > duration | Reset to valid timestamp | Auto-correct |

### Access Control Errors

| Scenario | Detection | User Experience | Recovery |
|----------|-----------|-----------------|----------|
| Unauthorized Course Access | No enrollment found | "Purchase required" modal | Redirect to checkout |
| Admin-Only Page (Non-Admin) | role !== 'ADMIN' | 403 Access Denied page | Return to home |
| Expired Enrollment | enrolledAt + 1 year < now | "Subscription expired" | Re-purchase option |
| Concurrent Stream Limit | >1 active stream | "Max streams exceeded" | Close other sessions |

---

## Data Persistence Scenarios

### localStorage Quota Exceeded

| Trigger | When storage > 5-10MB |
|---------|---------------------|
| Detection | `localStorage.setItem()` throws QuotaExceededError |
| Fallback | Switch to IndexedDB or sessionStorage |
| User Message | "Storage full. Clear cache?" |

### Browser Data Cleared

| Scenario | User clears cookies/cache |
|----------|---------------------------|
| Lost Data | Session, progress, notes |
| Recovery | Re-login, fetch from server |
| Prevention | Sync to backend frequently |

### Cross-Tab Sync

| Scenario | User opens multiple tabs |
|----------|--------------------------|
| Issue | localStorage changes not reflected |
| Solution | `window.addEventListener('storage', sync)` |
| Result | Auto-update on other tabs |

---

## Performance Optimization

### Video Preloading

```typescript
// Preload next module while watching current
useEffect(() => {
  if (activeChapterIndex < course.chapters.length - 1) {
    const nextModule = course.chapters[activeChapterIndex + 1]
    const preloadLink = document.createElement('link')
    preloadLink.rel = 'prefetch'
    preloadLink.href = nextModule.videoUrl
    document.head.appendChild(preloadLink)
  }
}, [activeChapterIndex])
```

### Lazy Loading Courses

```typescript
// Load courses in batches on storefront
const [visibleCourses, setVisibleCourses] = useState(
  MOCK_COURSES.slice(0, 4)
)

const loadMore = () => {
  setVisibleCourses(prev => [
    ...prev,
    ...MOCK_COURSES.slice(prev.length, prev.length + 4)
  ])
}

// Infinite scroll
useInfiniteScroll(loadMore)
```

---

## Accessibility (A11Y)

### Keyboard Navigation

| Element | Key | Action |
|---------|-----|--------|
| Video Player | Tab | Focus controls |
| Module List | Arrow Up/Down | Navigate modules |
| Modal | Escape | Close modal |
| Buttons | Enter/Space | Activate |

### Screen Reader Support

```typescript
// ARIA labels for video player
<video aria-label="Course video player">
<button aria-label="Play video">▶</button>
<button aria-label="Mute audio">🔊</button>
<input type="range" aria-label="Video progress" />
```

---

## Security Checklist

- [x] Right-click disabled on video player
- [x] Concurrent login detection (logout on device 2)
- [x] Session token validation every 10s
- [x] E.164 phone number validation
- [ ] CSRF tokens on payment forms
- [ ] Video URL signing with expiry
- [ ] Rate limiting on API endpoints
- [ ] XSS sanitization on user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] HTTPS only (no mixed content)

---

*End of User Flow Documentation*
