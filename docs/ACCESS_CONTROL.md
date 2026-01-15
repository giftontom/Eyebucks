# 🔐 Eyebuckz LMS - Access Control & Security Documentation

## Table of Contents
1. [Route Protection Matrix](#route-protection-matrix)
2. [Authentication System](#authentication-system)
3. [Authorization Levels](#authorization-levels)
4. [Enrollment Verification](#enrollment-verification)
5. [Session Management](#session-management)
6. [Security Features](#security-features)
7. [Implementation Guide](#implementation-guide)

---

## Route Protection Matrix

### Complete Access Control Table

| Route | URL Pattern | Guest User | Logged In (No Purchase) | Enrolled User | Admin | Protection Type |
|-------|-------------|------------|------------------------|---------------|-------|-----------------|
| **Storefront** | `/` | ✅ View all courses | ✅ View all courses | ✅ View all courses | ✅ View all courses | Public |
| **Course Details** | `/course/:id` | ✅ View (modules locked) | ✅ View (modules locked) | ✅ View + enrolled badge | ✅ Full access | Public with conditional content |
| **Checkout** | `/checkout/:id` | 🔒 → Requires login | ✅ Can purchase | ✅ Already owned (skip) | ✅ Free access | Auth Required |
| **Dashboard** | `/dashboard` | 🔒 → Redirect to `/` | ✅ Empty state | ✅ Show enrolled courses | ✅ Show all courses | Auth Required |
| **Learn** | `/learn/:id` | 🔒 → Redirect to `/` | 🔒 → Redirect to `/checkout/:id` | ✅ Full video player access | ✅ Full access | Auth + Enrollment Required |
| **Admin** | `/admin` | 🔒 → Redirect to `/` | 🔒 → 403 Access Denied | 🔒 → 403 Access Denied | ✅ Full admin panel | Admin Role Required |

### Access Decision Flow

```
User Request → Check Auth Status → Check Authorization Level → Grant/Deny Access

Guest User:
  ├─ / (Storefront) → ALLOW
  ├─ /course/:id → ALLOW (limited view)
  ├─ /checkout/:id → REDIRECT to login
  ├─ /dashboard → REDIRECT to /
  ├─ /learn/:id → REDIRECT to /
  └─ /admin → REDIRECT to /

Logged In (No Purchase):
  ├─ / (Storefront) → ALLOW
  ├─ /course/:id → ALLOW (show "Enroll" button)
  ├─ /checkout/:id → ALLOW (payment flow)
  ├─ /dashboard → ALLOW (empty state)
  ├─ /learn/:id → CHECK ENROLLMENT → REDIRECT to /checkout/:id
  └─ /admin → CHECK ROLE → 403 Access Denied

Enrolled User:
  ├─ / (Storefront) → ALLOW
  ├─ /course/:id → ALLOW (show "Go to Course" button)
  ├─ /checkout/:id → ALLOW (show "Already Purchased" message)
  ├─ /dashboard → ALLOW (show enrolled courses)
  ├─ /learn/:id → CHECK ENROLLMENT → ALLOW if enrolled in this course
  └─ /admin → CHECK ROLE → 403 Access Denied

Admin User:
  ├─ / (Storefront) → ALLOW
  ├─ /course/:id → ALLOW (full access)
  ├─ /checkout/:id → ALLOW (skip payment)
  ├─ /dashboard → ALLOW (show all courses)
  ├─ /learn/:id → ALLOW (bypass enrollment check)
  └─ /admin → ALLOW (full admin panel)
```

---

## Authentication System

### Authentication States

#### 1. Guest User (Unauthenticated)
```typescript
AuthContext State:
{
  user: null,
  isGapCheckRequired: false
}

localStorage:
  eyebuckz_user: null
  eyebuckz_session_token: null
```

#### 2. Logged In User (Authenticated)
```typescript
AuthContext State:
{
  user: {
    id: "u_123",
    name: "Demo User",
    email: "demo@example.com",
    phone_e164: "+15551234567",
    avatar: "https://...",
    role: "USER",
    google_id: "g_12345"
  },
  isGapCheckRequired: false
}

localStorage:
  eyebuckz_user: '{"id":"u_123",...}'
  eyebuckz_session_token: 'token_1704441234567_x8k2p9'
```

#### 3. Admin User (Elevated Privileges)
```typescript
AuthContext State:
{
  user: {
    id: "admin_1",
    name: "Admin User",
    email: "admin@eyebuckz.com",
    phone_e164: "+1234567890",
    avatar: "https://...",
    role: "ADMIN" // ← Key difference
  },
  isGapCheckRequired: false
}

localStorage:
  eyebuckz_user: '{"id":"admin_1",...,"role":"ADMIN"}'
  eyebuckz_session_token: 'token_1704441234567_admin'
```

### Authentication Flow

#### Google OAuth Login (Simulated)
```typescript
// 1. User clicks "Start Learning" or "Login"
const handleLogin = async () => {
  await login() // From AuthContext
}

// 2. AuthContext calls authService
const login = async () => {
  const loggedInUser = await authService.login()
  setUser(loggedInUser)
  authService.saveSession(loggedInUser)

  // 3. Check Gap Check requirement
  if (!loggedInUser.phone_e164) {
    setIsGapCheckRequired(true)
  }
}

// 4. authService performs OAuth simulation
export const authService = {
  login: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate OAuth response
        const mockUser: User = {
          id: 'u_123',
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: 'https://images.unsplash.com/.../w=200',
          role: 'USER',
          google_id: 'g_12345'
          // phone_e164 undefined → triggers Gap Check
        }

        // Generate session token
        const newToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Store on "server" (mock)
        MOCK_SERVER_SESSION_STORE[mockUser.id] = newToken

        // Store on client
        localStorage.setItem(SESSION_TOKEN_KEY, newToken)

        resolve(mockUser)
      }, 800) // Simulate network delay
    })
  }
}
```

### Session Persistence

#### Auto-Login on Page Load
```typescript
// AuthContext.tsx - useEffect on component mount
useEffect(() => {
  const storedUser = authService.checkSession()
  if (storedUser) {
    setUser(storedUser)
    if (!storedUser.phone_e164) {
      setIsGapCheckRequired(true)
    }
  }
}, [])

// authService.ts
checkSession: (): User | null => {
  const stored = localStorage.getItem(USER_KEY)
  return stored ? JSON.parse(stored) : null
}
```

---

## Authorization Levels

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```
GUEST (Level 0)
  ↓ Login
USER (Level 1)
  ↓ Purchase Course
ENROLLED_USER (Level 2)
  ↓ Admin Promotion
ADMIN (Level 3)
```

### Permission Matrix

| Action | Guest | User | Enrolled User | Admin |
|--------|-------|------|---------------|-------|
| Browse Courses | ✅ | ✅ | ✅ | ✅ |
| View Course Details | ✅ | ✅ | ✅ | ✅ |
| Purchase Course | ❌ | ✅ | ✅ (skip) | ✅ (free) |
| Access Video Player | ❌ | ❌ | ✅ (own courses) | ✅ (all) |
| View Dashboard | ❌ | ✅ | ✅ | ✅ |
| Download Certificate | ❌ | ❌ | ✅ (completed) | ✅ |
| Create Course | ❌ | ❌ | ❌ | ✅ |
| Edit Course | ❌ | ❌ | ❌ | ✅ |
| Delete Course | ❌ | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| View Analytics | ❌ | ❌ | ❌ | ✅ |
| Issue Certificates | ❌ | ❌ | ❌ | ✅ |

### Authorization Checks

#### Component-Level Protection
```typescript
// Example: Protecting Admin Panel
export const Admin: React.FC = () => {
  const { user } = useAuth()

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p>You do not have permission to view this area.</p>
          <Link to="/">Return Home</Link>
        </div>
      </div>
    )
  }

  return <AdminPanel />
}
```

#### Route-Level Protection (React Router)
```typescript
// TO IMPLEMENT: ProtectedRoute wrapper
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireEnrollment?: string // courseId
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  requireEnrollment
}) => {
  const { user } = useAuth()

  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to="/" replace />
  }

  // Check admin role
  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  // Check enrollment
  if (requireEnrollment && !enrollmentService.hasAccess(user?.id, requireEnrollment)) {
    return <Navigate to={`/checkout/${requireEnrollment}`} replace />
  }

  return <>{children}</>
}

// Usage in App.tsx
<Routes>
  <Route path="/" element={<Storefront />} />
  <Route path="/course/:id" element={<CourseDetails />} />
  <Route
    path="/checkout/:id"
    element={
      <ProtectedRoute requireAuth>
        <Checkout />
      </ProtectedRoute>
    }
  />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute requireAuth>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/learn/:id"
    element={
      <ProtectedRoute requireAuth requireEnrollment=":id">
        <Learn />
      </ProtectedRoute>
    }
  />
  <Route
    path="/admin"
    element={
      <ProtectedRoute requireAuth requireAdmin>
        <Admin />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

## Enrollment Verification

### Enrollment Data Structure

```typescript
interface Enrollment {
  id: string                    // Unique enrollment ID
  userId: string                // User who enrolled
  courseId: string              // Course enrolled in
  enrolledAt: string            // ISO timestamp
  lastAccessedAt: string | null // Last time user opened course
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  paymentId?: string            // Razorpay payment ID
  orderId?: string              // Razorpay order ID
  amount: number                // Amount paid
  expiresAt?: string | null     // Optional: lifetime access vs subscription
  progress: {
    completedModules: string[]  // Array of completed module IDs
    currentModule: string | null // Last watched module
    overallPercent: number       // 0-100
    totalWatchTime: number       // Seconds
  }
}
```

### Enrollment Service (TO IMPLEMENT)

```typescript
// services/enrollmentService.ts

export const enrollmentService = {
  // Create new enrollment after successful payment
  enrollUser: async (data: {
    userId: string
    courseId: string
    paymentId: string
    orderId: string
    amount: number
  }): Promise<Enrollment> => {
    const enrollment: Enrollment = {
      id: `enr_${Date.now()}`,
      userId: data.userId,
      courseId: data.courseId,
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: null,
      status: 'ACTIVE',
      paymentId: data.paymentId,
      orderId: data.orderId,
      amount: data.amount,
      progress: {
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      }
    }

    // Option 1: localStorage (MVP)
    const enrollments = JSON.parse(
      localStorage.getItem('eyebuckz_enrollments') || '[]'
    )
    enrollments.push(enrollment)
    localStorage.setItem('eyebuckz_enrollments', JSON.stringify(enrollments))

    // Option 2: Backend API (Production)
    // await fetch('/api/enrollments', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify(enrollment)
    // })

    return enrollment
  },

  // Get all enrollments for a user
  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
    // Option 1: localStorage
    const enrollments = JSON.parse(
      localStorage.getItem('eyebuckz_enrollments') || '[]'
    )
    return enrollments.filter((e: Enrollment) => e.userId === userId)

    // Option 2: Backend API
    // const response = await fetch(`/api/enrollments/user/${userId}`)
    // return await response.json()
  },

  // Check if user has access to specific course
  hasAccess: async (userId: string | undefined, courseId: string): Promise<boolean> => {
    if (!userId) return false

    // Admin bypass
    const user = JSON.parse(localStorage.getItem('eyebuckz_user') || 'null')
    if (user?.role === 'ADMIN') return true

    // Check enrollment
    const enrollments = await enrollmentService.getUserEnrollments(userId)
    return enrollments.some(
      e => e.courseId === courseId && e.status === 'ACTIVE'
    )
  },

  // Update last accessed time
  updateLastAccess: async (userId: string, courseId: string): Promise<void> => {
    const enrollments = JSON.parse(
      localStorage.getItem('eyebuckz_enrollments') || '[]'
    )

    const updated = enrollments.map((e: Enrollment) => {
      if (e.userId === userId && e.courseId === courseId) {
        return { ...e, lastAccessedAt: new Date().toISOString() }
      }
      return e
    })

    localStorage.setItem('eyebuckz_enrollments', JSON.stringify(updated))
  },

  // Get single enrollment
  getEnrollment: async (userId: string, courseId: string): Promise<Enrollment | null> => {
    const enrollments = await enrollmentService.getUserEnrollments(userId)
    return enrollments.find(e => e.courseId === courseId) || null
  }
}
```

### Enrollment Check Implementation

#### In Learn Page
```typescript
// pages/Learn.tsx
export const Learn: React.FC = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const course = MOCK_COURSES.find(c => c.id === id)
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        // Not logged in
        alert('Please login to access this course')
        navigate('/')
        return
      }

      if (!id) return

      const enrolled = await enrollmentService.hasAccess(user.id, id)

      if (!enrolled) {
        // Not enrolled in this course
        const shouldPurchase = window.confirm(
          'You need to purchase this course to access it. Go to checkout?'
        )
        if (shouldPurchase) {
          navigate(`/checkout/${id}`)
        } else {
          navigate('/')
        }
        return
      }

      // Has access - update last accessed time
      await enrollmentService.updateLastAccess(user.id, id)
      setHasAccess(true)
      setIsLoading(false)
    }

    checkAccess()
  }, [user, id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will redirect via useEffect
  }

  return (
    <div>
      {/* Video player and course content */}
    </div>
  )
}
```

#### In Dashboard
```typescript
// pages/Dashboard.tsx
export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) return

      // Get user's enrollments
      const enrollments = await enrollmentService.getUserEnrollments(user.id)

      // Map to full course objects
      const courses = enrollments
        .filter(e => e.status === 'ACTIVE')
        .map(enrollment => {
          const course = MOCK_COURSES.find(c => c.id === enrollment.courseId)
          return {
            ...course,
            enrollmentId: enrollment.id,
            progress: enrollment.progress.overallPercent,
            enrolledAt: enrollment.enrolledAt,
            lastAccessedAt: enrollment.lastAccessedAt
          }
        })
        .filter(Boolean) // Remove null values

      setEnrolledCourses(courses)
      setIsLoading(false)
    }

    loadEnrollments()
  }, [user])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="text-center py-20">
        <p>You haven't enrolled in any courses yet.</p>
        <Link to="/">Browse Catalog</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>My Studio</h1>
      <div className="grid grid-cols-3 gap-6">
        {enrolledCourses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}
```

#### In Checkout (Skip if Already Enrolled)
```typescript
// pages/Checkout.tsx
export const Checkout: React.FC = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const course = MOCK_COURSES.find(c => c.id === id)
  const [alreadyOwned, setAlreadyOwned] = useState(false)

  useEffect(() => {
    const checkOwnership = async () => {
      if (user && id) {
        const owned = await enrollmentService.hasAccess(user.id, id)
        if (owned) {
          setAlreadyOwned(true)
        }
      }
    }
    checkOwnership()
  }, [user, id])

  if (alreadyOwned) {
    return (
      <div className="text-center py-20">
        <h2>You already own this course!</h2>
        <Link to={`/learn/${id}`}>
          <button>Go to Course</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Checkout form */}
    </div>
  )
}
```

---

## Session Management

### Session Token System

#### Token Generation
```typescript
// When user logs in
const newToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
// Example: "token_1704441234567_x8k2p9"

// Store on server (mock)
MOCK_SERVER_SESSION_STORE[userId] = newToken

// Store on client
localStorage.setItem('eyebuckz_session_token', newToken)
```

#### Token Validation
```typescript
// Check if client token matches server token
export const authService = {
  validateSessionToken: async (userId: string): Promise<boolean> => {
    const currentClientToken = localStorage.getItem(SESSION_TOKEN_KEY)
    const validServerToken = MOCK_SERVER_SESSION_STORE[userId]

    // If tokens don't match, session is invalid (concurrent login)
    if (validServerToken && currentClientToken !== validServerToken) {
      return false
    }

    return true
  }
}
```

### Concurrent Login Detection

#### Background Polling
```typescript
// AuthContext.tsx - Runs every 10 seconds
useEffect(() => {
  if (!user) return

  const intervalId = setInterval(async () => {
    const isValid = await authService.validateSessionToken(user.id)

    if (!isValid) {
      alert('You have been logged out because your account was accessed from another device.')
      logout()
    }
  }, 10000) // 10 seconds

  return () => clearInterval(intervalId)
}, [user])
```

#### Scenario Flow
```
Timeline:
10:00 AM - User logs in on Device A
          Server: STORE[u_123] = "token_A"
          Device A: localStorage = "token_A"

10:05 AM - User logs in on Device B
          Server: STORE[u_123] = "token_B" ← Updated!
          Device B: localStorage = "token_B"

10:05:10 AM - Device A polls server
             Device A token: "token_A"
             Server token: "token_B"
             Result: token_A ≠ token_B → INVALID
             Action: Force logout on Device A
```

### Session Expiry (TO IMPLEMENT)

```typescript
interface SessionData {
  token: string
  userId: string
  expiresAt: string // ISO timestamp
  issuedAt: string
}

// Generate session with expiry
const createSession = (userId: string): SessionData => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  return {
    token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    expiresAt: expiresAt.toISOString(),
    issuedAt: now.toISOString()
  }
}

// Validate expiry
const isSessionExpired = (session: SessionData): boolean => {
  return new Date(session.expiresAt) < new Date()
}
```

---

## Security Features

### 1. Gap Check (Phone Verification)

#### Purpose
- Ensure all users have verified contact information
- Enable 2FA recovery
- Reduce spam accounts

#### Implementation
```typescript
// Trigger: User logs in without phone number
if (!loggedInUser.phone_e164) {
  setIsGapCheckRequired(true) // Shows blocking modal
}

// Modal cannot be dismissed except by:
// 1. Providing valid phone number
// 2. Logging out
```

#### Validation (E.164 Format)
```typescript
const e164Regex = /^\+[1-9]\d{1,14}$/

// Valid examples:
+15551234567 (USA)
+442071234567 (UK)
+919876543210 (India)

// Invalid examples:
1234567890 (missing + prefix)
+0123456789 (starts with 0)
+1234567890123456 (too long)
```

### 2. Video Player Protection

#### Right-Click Disabled
```typescript
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }
  document.addEventListener('contextmenu', handleContextMenu)

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu)
  }
}, [])
```

#### Custom Controls (No Native Download)
```typescript
<video
  controls={false} // Disable native controls
  controlsList="nodownload" // Backup protection
  disablePictureInPicture
  onContextMenu={(e) => e.preventDefault()}
>
```

#### DevTools Detection (Future)
```typescript
// Detect if DevTools is open
const detectDevTools = () => {
  const threshold = 160
  const widthThreshold = window.outerWidth - window.innerWidth > threshold
  const heightThreshold = window.outerHeight - window.innerHeight > threshold

  if (widthThreshold || heightThreshold) {
    // DevTools likely open
    videoRef.current?.pause()
    alert('Please close developer tools to continue')
  }
}

// Check every 1 second
setInterval(detectDevTools, 1000)
```

### 3. Signed Video URLs (TO IMPLEMENT - Production)

```typescript
// Backend generates signed URL with expiry
const generateSignedUrl = (
  videoId: string,
  userId: string,
  expiresIn: number = 3600 // 1 hour
): string => {
  const expiresAt = Date.now() + expiresIn * 1000
  const signature = crypto
    .createHmac('sha256', process.env.VIDEO_SECRET!)
    .update(`${videoId}:${userId}:${expiresAt}`)
    .digest('hex')

  return `https://cdn.eyebuckz.com/videos/${videoId}?user=${userId}&expires=${expiresAt}&sig=${signature}`
}

// Frontend uses signed URL
const videoUrl = await fetch(`/api/videos/${moduleId}/signed-url`).then(r => r.json())
videoRef.current.src = videoUrl

// CDN validates signature before serving video
const validateSignature = (req) => {
  const { videoId, user, expires, sig } = req.query

  if (Date.now() > parseInt(expires)) {
    return { valid: false, error: 'URL expired' }
  }

  const expectedSig = crypto
    .createHmac('sha256', process.env.VIDEO_SECRET!)
    .update(`${videoId}:${user}:${expires}`)
    .digest('hex')

  return { valid: sig === expectedSig }
}
```

### 4. Rate Limiting (TO IMPLEMENT)

```typescript
// Backend: Limit API requests per user
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

app.use('/api/', apiLimiter)

// Frontend: Exponential backoff on errors
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3) => {
  try {
    const response = await fetch(url, options)
    if (!response.ok && response.status === 429 && retries > 0) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 2 ** (4 - retries) * 1000))
      return fetchWithRetry(url, options, retries - 1)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2 ** (4 - retries) * 1000))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}
```

### 5. CSRF Protection (TO IMPLEMENT)

```typescript
// Backend: Generate CSRF token
import csrf from 'csurf'

const csrfProtection = csrf({ cookie: true })

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

app.post('/api/checkout/create-order', csrfProtection, async (req, res) => {
  // CSRF token validated automatically
  // Process order...
})

// Frontend: Include CSRF token in requests
const csrfToken = await fetch('/api/csrf-token').then(r => r.json())

await fetch('/api/checkout/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(orderData)
})
```

---

## Implementation Guide

### Quick Start Checklist

#### Phase 1: Basic Access Control (Critical)
- [ ] Create `enrollmentService.ts`
- [ ] Implement `hasAccess()` check in Learn page
- [ ] Add enrollment verification to Dashboard
- [ ] Create enrollment after payment success
- [ ] Update Checkout to skip if already enrolled

#### Phase 2: Route Protection
- [ ] Create `ProtectedRoute` component
- [ ] Wrap protected routes in App.tsx
- [ ] Add redirect logic for unauthenticated users
- [ ] Add 403 page for unauthorized access

#### Phase 3: Admin Controls
- [ ] Add admin check to Admin page
- [ ] Implement role-based UI hiding
- [ ] Add admin-only API endpoints
- [ ] Create admin audit log

#### Phase 4: Security Hardening
- [ ] Implement session expiry
- [ ] Add CSRF tokens to forms
- [ ] Set up rate limiting
- [ ] Implement signed video URLs
- [ ] Add DevTools detection

### Code Snippets

#### Enrollment After Payment
```typescript
// pages/Checkout.tsx - After webhook verification
const handlePaymentSuccess = async (paymentData: {
  paymentId: string
  orderId: string
  signature: string
}) => {
  // Verify signature (backend)
  const verified = await verifyPayment(paymentData)

  if (verified) {
    // Create enrollment
    await enrollmentService.enrollUser({
      userId: user.id,
      courseId: course.id,
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      amount: course.price
    })

    // Redirect to dashboard
    navigate('/dashboard')
  }
}
```

#### Protected Route Wrapper
```typescript
// components/ProtectedRoute.tsx
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { enrollmentService } from '../services/enrollmentService'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireEnrollment?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  requireEnrollment = false
}) => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (requireAuth && !user) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      if (requireAdmin && user?.role !== 'ADMIN') {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      if (requireEnrollment && id) {
        const enrolled = await enrollmentService.hasAccess(user?.id, id)
        setHasAccess(enrolled)
        setIsLoading(false)
        return
      }

      setHasAccess(true)
      setIsLoading(false)
    }

    checkAccess()
  }, [user, id, requireAuth, requireAdmin, requireEnrollment])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!hasAccess) {
    if (requireAuth && !user) {
      return <Navigate to="/" replace />
    }
    if (requireAdmin) {
      return <div>403 - Access Denied</div>
    }
    if (requireEnrollment && id) {
      return <Navigate to={`/checkout/${id}`} replace />
    }
  }

  return <>{children}</>
}
```

---

## Security Best Practices

### Production Checklist

- [x] ✅ Right-click disabled on video player
- [x] ✅ Concurrent login detection (10s polling)
- [x] ✅ Session token validation
- [x] ✅ E.164 phone validation
- [ ] ❌ CSRF tokens on forms
- [ ] ❌ Signed video URLs with expiry
- [ ] ❌ Rate limiting on API endpoints
- [ ] ❌ XSS sanitization on user inputs
- [ ] ❌ SQL injection prevention (parameterized queries)
- [ ] ❌ HTTPS only (no mixed content)
- [ ] ❌ Content Security Policy headers
- [ ] ❌ Session expiry (7 days)
- [ ] ❌ DevTools detection
- [ ] ❌ IP-based rate limiting
- [ ] ❌ Captcha on login/signup

### Environment Variables

```bash
# .env.local (Backend)
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
JWT_SECRET=your_jwt_secret
VIDEO_SECRET=your_video_signing_secret
DATABASE_URL=postgresql://...
SESSION_SECRET=your_session_secret
```

---

*End of Access Control Documentation*
