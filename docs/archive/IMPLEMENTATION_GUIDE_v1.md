# 🛠️ Eyebuckz LMS - Implementation Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Phase 1: Critical Features](#phase-1-critical-features-week-1)
3. [Phase 2: Payment Integration](#phase-2-payment-integration-week-2)
4. [Phase 3: Backend Setup](#phase-3-backend-setup-week-3-4)
5. [Phase 4: Polish & Optimization](#phase-4-polish--optimization-week-5)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

---

## Quick Start

### Prerequisites
```bash
Node.js >= 18
npm >= 9
Git
PostgreSQL (optional for Phase 3)
```

### Current Project Status

#### ✅ Completed Features
- React 19 + TypeScript + Vite setup
- React Router with 6 routes
- Tailwind CSS (CDN-based)
- Mock Google OAuth login
- Session management (localStorage)
- Gap Check Modal (phone verification)
- Video player with custom controls
- Progress tracking (console logs only)
- Admin panel UI
- Right-click protection

#### ❌ Missing Critical Features
- **Enrollment System** (most critical!)
- Enrollment verification before accessing videos
- Progress persistence (localStorage/DB)
- Payment gateway integration
- Backend API
- Database
- Email notifications
- Certificate generation

---

## Phase 1: Critical Features (Week 1)

### Priority: HIGHEST
**Goal:** Make the system functional with localStorage

---

### Task 1.1: Create Enrollment Service

**File:** `services/enrollmentService.ts`

```typescript
import { Enrollment } from '../types'

const ENROLLMENTS_KEY = 'eyebuckz_enrollments'

export const enrollmentService = {
  // Create enrollment after payment
  enrollUser: (data: {
    userId: string
    courseId: string
    paymentId?: string
    orderId?: string
    amount: number
  }): Enrollment => {
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
      expiresAt: null,
      progress: {
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      }
    }

    // Save to localStorage
    const enrollments = enrollmentService.getAll()
    enrollments.push(enrollment)
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments))

    return enrollment
  },

  // Get all enrollments
  getAll: (): Enrollment[] => {
    const stored = localStorage.getItem(ENROLLMENTS_KEY)
    return stored ? JSON.parse(stored) : []
  },

  // Get user's enrollments
  getUserEnrollments: (userId: string): Enrollment[] => {
    const all = enrollmentService.getAll()
    return all.filter(e => e.userId === userId && e.status === 'ACTIVE')
  },

  // Check if user has access to course
  hasAccess: (userId: string | undefined, courseId: string): boolean => {
    if (!userId) return false

    // Admin bypass
    const userStr = localStorage.getItem('eyebuckz_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.role === 'ADMIN') return true
    }

    const enrollments = enrollmentService.getUserEnrollments(userId)
    return enrollments.some(e => e.courseId === courseId)
  },

  // Get specific enrollment
  getEnrollment: (userId: string, courseId: string): Enrollment | null => {
    const enrollments = enrollmentService.getUserEnrollments(userId)
    return enrollments.find(e => e.courseId === courseId) || null
  },

  // Update last accessed time
  updateLastAccess: (userId: string, courseId: string): void => {
    const enrollments = enrollmentService.getAll()
    const updated = enrollments.map(e => {
      if (e.userId === userId && e.courseId === courseId) {
        return { ...e, lastAccessedAt: new Date().toISOString() }
      }
      return e
    })
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(updated))
  },

  // Update progress
  updateProgress: (
    userId: string,
    courseId: string,
    data: Partial<Enrollment['progress']>
  ): void => {
    const enrollments = enrollmentService.getAll()
    const updated = enrollments.map(e => {
      if (e.userId === userId && e.courseId === courseId) {
        return {
          ...e,
          progress: { ...e.progress, ...data }
        }
      }
      return e
    })
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(updated))
  }
}
```

**Update types.ts:**
```typescript
export interface Enrollment {
  id: string
  userId: string
  courseId: string
  enrolledAt: string
  lastAccessedAt: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  paymentId?: string
  orderId?: string
  amount: number
  expiresAt?: string | null
  progress: {
    completedModules: string[]
    currentModule: string | null
    overallPercent: number
    totalWatchTime: number
  }
}
```

**Testing:**
```typescript
// In browser console
const { enrollmentService } = await import('./services/enrollmentService.ts')

// Test enrollment creation
enrollmentService.enrollUser({
  userId: 'u_123',
  courseId: 'c1-masterclass',
  amount: 14999
})

// Test access check
console.log(enrollmentService.hasAccess('u_123', 'c1-masterclass')) // true
console.log(enrollmentService.hasAccess('u_123', 'c2-scripting')) // false
```

**Checklist:**
- [ ] Create `services/enrollmentService.ts`
- [ ] Add `Enrollment` interface to `types.ts`
- [ ] Test enrollment creation
- [ ] Test access checks
- [ ] Test admin bypass

---

### Task 1.2: Protect Learn Page

**File:** `pages/Learn.tsx`

**Add access check at the top:**
```typescript
export const Learn: React.FC = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Access control check
  useEffect(() => {
    const checkAccess = async () => {
      // Must be logged in
      if (!user) {
        alert('Please login to access this course')
        navigate('/')
        return
      }

      if (!id) return

      // Check enrollment
      const enrolled = enrollmentService.hasAccess(user.id, id)

      if (!enrolled) {
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

      // Update last accessed
      enrollmentService.updateLastAccess(user.id, id)
      setHasAccess(true)
      setIsLoading(false)
    }

    checkAccess()
  }, [user, id, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Loading course...</div>
      </div>
    )
  }

  // No access (will redirect)
  if (!hasAccess) {
    return null
  }

  // Rest of component...
}
```

**Checklist:**
- [ ] Add access check useEffect
- [ ] Add loading state
- [ ] Test with enrolled user (should work)
- [ ] Test with non-enrolled user (should redirect)
- [ ] Test with guest user (should redirect to home)

---

### Task 1.3: Update Dashboard to Show Real Enrollments

**File:** `pages/Dashboard.tsx`

**Replace hardcoded courses:**
```typescript
export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) return

      // Get user's enrollments
      const enrollments = enrollmentService.getUserEnrollments(user.id)

      // Map to full course objects with progress
      const courses = enrollments.map(enrollment => {
        const course = MOCK_COURSES.find(c => c.id === enrollment.courseId)
        if (!course) return null

        return {
          ...course,
          enrollmentId: enrollment.id,
          progress: enrollment.progress.overallPercent,
          enrolledAt: enrollment.enrolledAt,
          lastAccessedAt: enrollment.lastAccessedAt
        }
      }).filter(Boolean) // Remove nulls

      setEnrolledCourses(courses)
      setIsLoading(false)
    }

    loadEnrollments()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl">
        <p className="text-slate-500 mb-4">
          You haven't enrolled in any masterclasses yet.
        </p>
        <Link to="/" className="text-brand-600 hover:text-brand-700 font-bold">
          Browse Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-slate-900">My Studio</h1>
      <p className="text-slate-500 mt-1">Welcome back, {user?.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {enrolledCourses.map(course => (
          <div key={course.id} className="...">
            {/* Course card with progress */}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Checklist:**
- [ ] Replace hardcoded `myCourses`
- [ ] Load from `enrollmentService`
- [ ] Show empty state if no enrollments
- [ ] Test with 0 enrollments
- [ ] Test with 1 enrollment
- [ ] Test with multiple enrollments

---

### Task 1.4: Connect Checkout to Enrollment

**File:** `pages/Checkout.tsx`

**After payment success (in webhook simulation):**
```typescript
const handlePaymentSuccess = async () => {
  setStatus('VERIFYING')

  setTimeout(() => {
    // Simulate webhook verification success

    // CREATE ENROLLMENT HERE!
    enrollmentService.enrollUser({
      userId: user!.id,
      courseId: course!.id,
      paymentId: `pay_${Date.now()}`,
      orderId: `order_${Date.now()}`,
      amount: course!.price
    })

    setStatus('SUCCESS')

    // Redirect to dashboard
    setTimeout(() => {
      navigate('/dashboard')
    }, 1500)
  }, 1500)
}
```

**Also add "Already Owned" check:**
```typescript
export const Checkout: React.FC = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const course = MOCK_COURSES.find(c => c.id === id)
  const [alreadyOwned, setAlreadyOwned] = useState(false)

  useEffect(() => {
    const checkOwnership = () => {
      if (user && id) {
        const owned = enrollmentService.hasAccess(user.id, id)
        setAlreadyOwned(owned)
      }
    }
    checkOwnership()
  }, [user, id])

  if (alreadyOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl border">
          <h2 className="text-2xl font-bold mb-4">You already own this course!</h2>
          <Link to={`/learn/${id}`}>
            <button className="bg-brand-600 text-white px-6 py-3 rounded-lg">
              Go to Course
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // Rest of checkout flow...
}
```

**Checklist:**
- [ ] Add enrollment creation after payment
- [ ] Add "Already Owned" check
- [ ] Test enrollment creation
- [ ] Verify enrollment appears in Dashboard
- [ ] Verify Learn page allows access after purchase

---

### Task 1.5: Add Progress Persistence

**File:** `pages/Learn.tsx`

**Create progress service:**
```typescript
// services/progressService.ts
export const progressService = {
  saveProgress: (userId: string, courseId: string, moduleId: string, timestamp: number) => {
    const key = `eyebuckz_progress_${userId}_${courseId}`
    const stored = localStorage.getItem(key)
    const progress = stored ? JSON.parse(stored) : { modules: [] }

    // Find or create module progress
    const moduleIndex = progress.modules.findIndex((m: any) => m.moduleId === moduleId)

    if (moduleIndex >= 0) {
      // Update existing
      progress.modules[moduleIndex].lastTimestamp = timestamp
      progress.modules[moduleIndex].watchTime += 30 // Increment by 30s
      progress.modules[moduleIndex].lastUpdatedAt = new Date().toISOString()
    } else {
      // Create new
      progress.modules.push({
        moduleId,
        lastTimestamp: timestamp,
        completed: false,
        completedAt: null,
        watchTime: 30,
        viewCount: 1,
        lastUpdatedAt: new Date().toISOString()
      })
    }

    progress.lastSyncedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(progress))
  },

  markComplete: (userId: string, courseId: string, moduleId: string) => {
    const key = `eyebuckz_progress_${userId}_${courseId}`
    const stored = localStorage.getItem(key)
    const progress = stored ? JSON.parse(stored) : { modules: [] }

    const moduleIndex = progress.modules.findIndex((m: any) => m.moduleId === moduleId)

    if (moduleIndex >= 0) {
      progress.modules[moduleIndex].completed = true
      progress.modules[moduleIndex].completedAt = new Date().toISOString()
    }

    localStorage.setItem(key, JSON.stringify(progress))

    // Update enrollment progress
    const completedCount = progress.modules.filter((m: any) => m.completed).length
    const totalModules = MOCK_COURSES.find(c => c.id === courseId)?.chapters.length || 1
    const overallPercent = Math.round((completedCount / totalModules) * 100)

    enrollmentService.updateProgress(userId, courseId, {
      completedModules: progress.modules.filter((m: any) => m.completed).map((m: any) => m.moduleId),
      overallPercent
    })
  },

  getProgress: (userId: string, courseId: string) => {
    const key = `eyebuckz_progress_${userId}_${courseId}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : { modules: [] }
  }
}
```

**Update Learn.tsx auto-save:**
```typescript
// Replace console.log with actual save
useEffect(() => {
  const saveProgress = () => {
    if (!videoRef.current || !user || !course?.id || !activeChapterId) return
    const timestamp = Math.floor(videoRef.current.currentTime)

    // Save to localStorage
    progressService.saveProgress(user.id, course.id, activeChapterId, timestamp)
  }

  const interval = setInterval(() => {
    if (isPlaying) saveProgress()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [isPlaying, activeChapterId, user, course])
```

**Checklist:**
- [ ] Create `progressService.ts`
- [ ] Replace console.log with actual save
- [ ] Implement markComplete at 95%
- [ ] Test progress saving
- [ ] Test module completion
- [ ] Verify progress updates in Dashboard

---

## Phase 2: Payment Integration (Week 2)

### Task 2.1: Set Up Razorpay

**Install Razorpay SDK:**
```bash
npm install razorpay
npm install --save-dev @types/razorpay
```

**Create .env.local:**
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

**Update Checkout.tsx:**
```typescript
import { useScript } from '../hooks/useScript'

export const Checkout: React.FC = () => {
  // Load Razorpay script
  const razorpayLoaded = useScript('https://checkout.razorpay.com/v1/checkout.js')

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      alert('Payment gateway loading...')
      return
    }

    // Step 1: Create order on backend
    const orderResponse = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: course.id,
        amount: course.price,
        currency: 'INR'
      })
    })

    const { orderId, amount, currency, key } = await orderResponse.json()

    // Step 2: Open Razorpay checkout
    const options = {
      key: key,
      amount: amount,
      currency: currency,
      name: 'Eyebuckz',
      description: course.title,
      order_id: orderId,
      handler: async (response: any) => {
        // Step 3: Payment successful
        setStatus('VERIFYING')

        // Verify on backend
        const verifyResponse = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            courseId: course.id,
            userId: user.id
          })
        })

        const { success } = await verifyResponse.json()

        if (success) {
          // Create enrollment
          enrollmentService.enrollUser({
            userId: user.id,
            courseId: course.id,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            amount: course.price
          })

          setStatus('SUCCESS')
          setTimeout(() => navigate('/dashboard'), 1500)
        } else {
          alert('Payment verification failed')
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: user.phone_e164
      },
      theme: {
        color: '#ef4444'
      }
    }

    const razorpay = new (window as any).Razorpay(options)
    razorpay.open()
  }

  // Rest of component...
}
```

**Create useScript hook:**
```typescript
// hooks/useScript.ts
import { useEffect, useState } from 'react'

export const useScript = (src: string) => {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => setLoaded(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [src])

  return loaded
}
```

**Checklist:**
- [ ] Install Razorpay SDK
- [ ] Create useScript hook
- [ ] Update Checkout.tsx
- [ ] Test with Razorpay test mode
- [ ] Handle payment failures
- [ ] Add loading states

---

### Task 2.2: Backend Payment Endpoints

**File:** `server/api/checkout.ts` (if using Express/Next.js)

```typescript
import Razorpay from 'razorpay'
import crypto from 'crypto'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

// Create order
export async function createOrder(req, res) {
  const { courseId, amount, currency } = req.body

  const options = {
    amount: amount, // paise
    currency: currency,
    receipt: `order_${Date.now()}`,
    notes: {
      courseId,
      userId: req.user.id
    }
  }

  try {
    const order = await razorpay.orders.create(options)
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' })
  }
}

// Verify payment
export async function verifyPayment(req, res) {
  const { orderId, paymentId, signature, courseId, userId } = req.body

  // Generate expected signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  if (generatedSignature !== signature) {
    return res.status(400).json({ success: false, error: 'Invalid signature' })
  }

  // Create enrollment in database
  await db.enrollments.create({
    userId,
    courseId,
    paymentId,
    orderId,
    amount: req.body.amount,
    status: 'ACTIVE'
  })

  res.json({ success: true })
}

// Webhook handler
export async function handleWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!

  const signature = req.headers['x-razorpay-signature']
  const body = JSON.stringify(req.body)

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(400).send('Invalid signature')
  }

  const event = req.body.event

  if (event === 'payment.captured') {
    const payment = req.body.payload.payment.entity
    // Handle successful payment
    // Create enrollment, send email, etc.
  }

  res.json({ success: true })
}
```

**Checklist:**
- [ ] Set up backend server (Express/Next.js)
- [ ] Install Razorpay SDK on backend
- [ ] Implement createOrder endpoint
- [ ] Implement verifyPayment endpoint
- [ ] Implement webhook handler
- [ ] Test with Razorpay test cards

---

## Phase 3: Backend Setup (Week 3-4)

### Task 3.1: Database Setup

**Install dependencies:**
```bash
npm install prisma @prisma/client
npm install --save-dev @types/node
```

**Initialize Prisma:**
```bash
npx prisma init
```

**Create schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          String        @id @default(cuid())
  name        String
  email       String        @unique
  phoneE164   String?       @map("phone_e164")
  avatar      String
  role        Role          @default(USER)
  googleId    String?       @unique @map("google_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  enrollments Enrollment[]
  progress    Progress[]
  reviews     Review[]
  certificates Certificate[]

  @@map("users")
}

model Course {
  id            String        @id @default(cuid())
  slug          String        @unique
  title         String
  description   String
  price         Int
  thumbnail     String
  type          CourseType
  status        CourseStatus  @default(DRAFT)
  rating        Float?
  totalStudents Int           @default(0) @map("total_students")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  publishedAt   DateTime?     @map("published_at")
  modules       Module[]
  enrollments   Enrollment[]
  reviews       Review[]
  certificates  Certificate[]

  @@map("courses")
}

model Module {
  id              String     @id @default(cuid())
  courseId        String     @map("course_id")
  course          Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title           String
  duration        String
  durationSeconds Int        @map("duration_seconds")
  videoUrl        String     @map("video_url")
  isFreePreview   Boolean    @default(false) @map("is_free_preview")
  orderIndex      Int        @map("order_index")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")
  progress        Progress[]

  @@map("modules")
}

model Enrollment {
  id             String           @id @default(cuid())
  userId         String           @map("user_id")
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId       String           @map("course_id")
  course         Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  enrolledAt     DateTime         @default(now()) @map("enrolled_at")
  lastAccessedAt DateTime?        @map("last_accessed_at")
  status         EnrollmentStatus @default(ACTIVE)
  paymentId      String?          @map("payment_id")
  orderId        String?          @map("order_id")
  amount         Int
  expiresAt      DateTime?        @map("expires_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  @@unique([userId, courseId])
  @@map("enrollments")
}

model Progress {
  id            String    @id @default(cuid())
  userId        String    @map("user_id")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId      String    @map("course_id")
  moduleId      String    @map("module_id")
  module        Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  timestamp     Int       @default(0)
  completed     Boolean   @default(false)
  completedAt   DateTime? @map("completed_at")
  watchTime     Int       @default(0) @map("watch_time")
  viewCount     Int       @default(0) @map("view_count")
  lastUpdatedAt DateTime  @updatedAt @map("last_updated_at")

  @@unique([userId, courseId, moduleId])
  @@map("progress")
}

model Review {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId  String   @map("course_id")
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  rating    Int
  comment   String
  helpful   Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, courseId])
  @@map("reviews")
}

model Certificate {
  id                String            @id @default(cuid())
  userId            String            @map("user_id")
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId          String            @map("course_id")
  course            Course            @relation(fields: [courseId], references: [id], onDelete: Cascade)
  certificateNumber String            @unique @map("certificate_number")
  studentName       String            @map("student_name")
  courseTitle       String            @map("course_title")
  issueDate         DateTime          @map("issue_date")
  completionDate    DateTime          @map("completion_date")
  downloadUrl       String?           @map("download_url")
  status            CertificateStatus @default(ACTIVE)
  revokedAt         DateTime?         @map("revoked_at")
  revokedReason     String?           @map("revoked_reason")
  createdAt         DateTime          @default(now()) @map("created_at")

  @@unique([userId, courseId])
  @@map("certificates")
}

enum Role {
  USER
  ADMIN
}

enum CourseType {
  BUNDLE
  MODULE
}

enum CourseStatus {
  PUBLISHED
  DRAFT
}

enum EnrollmentStatus {
  ACTIVE
  EXPIRED
  REVOKED
  PENDING
}

enum CertificateStatus {
  ACTIVE
  REVOKED
}
```

**Run migration:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Checklist:**
- [ ] Install Prisma
- [ ] Create schema
- [ ] Run migrations
- [ ] Seed database with mock courses
- [ ] Test database connection

---

## Phase 4: Polish & Optimization (Week 5)

### Task 4.1: Add Loading States

**Create LoadingSpinner component:**
```typescript
// components/LoadingSpinner.tsx
export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-brand-600"></div>
  </div>
)
```

**Use throughout app:**
- Dashboard loading
- Learn page loading
- Checkout processing
- Course details loading

---

### Task 4.2: Error Boundaries

```typescript
// components/ErrorBoundary.tsx
import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Test enrollmentService:**
```typescript
// services/enrollmentService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { enrollmentService } from './enrollmentService'

describe('enrollmentService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should create enrollment', () => {
    const enrollment = enrollmentService.enrollUser({
      userId: 'u_1',
      courseId: 'c_1',
      amount: 14999
    })

    expect(enrollment.userId).toBe('u_1')
    expect(enrollment.courseId).toBe('c_1')
    expect(enrollment.status).toBe('ACTIVE')
  })

  it('should check access correctly', () => {
    enrollmentService.enrollUser({
      userId: 'u_1',
      courseId: 'c_1',
      amount: 14999
    })

    expect(enrollmentService.hasAccess('u_1', 'c_1')).toBe(true)
    expect(enrollmentService.hasAccess('u_1', 'c_2')).toBe(false)
  })
})
```

---

### E2E Tests (Playwright)

```bash
npm install -D @playwright/test
npx playwright install
```

**Test purchase flow:**
```typescript
// e2e/purchase.spec.ts
import { test, expect } from '@playwright/test'

test('complete purchase flow', async ({ page }) => {
  // 1. Go to storefront
  await page.goto('http://localhost:3000')

  // 2. Click course
  await page.click('text=Complete Content Creation Masterclass')

  // 3. Click enroll
  await page.click('text=Enroll for ₹14,999')

  // 4. Login (mock)
  await page.click('text=Continue with Google')
  await page.waitForSelector('text=Final Step Required')

  // 5. Enter phone
  await page.fill('input[type="tel"]', '+15551234567')
  await page.click('text=Secure Account & Continue')

  // 6. Complete payment (mock)
  await page.click('text=Pay ₹14,999')
  await page.waitForSelector('text=Payment Successful!')

  // 7. Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard')

  // 8. Verify course appears
  await expect(page.locator('text=Complete Content Creation')).toBeVisible()
})
```

---

## Deployment Checklist

### Environment Setup

**Frontend (.env.production):**
```bash
VITE_API_URL=https://api.eyebuckz.com
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

**Backend (.env.production):**
```bash
DATABASE_URL=postgresql://...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
JWT_SECRET=...
VIDEO_SECRET=...
```

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables set
- [ ] Database migrated
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] CDN configured for videos
- [ ] Backup strategy in place
- [ ] Monitoring setup (Sentry)
- [ ] Analytics setup (Google Analytics)

### Deployment Steps

1. **Build frontend:**
```bash
npm run build
```

2. **Deploy to Cloudflare Pages:**
```bash
npx wrangler pages deploy dist --project-name eyebucks
```

3. **Deploy backend:**
```bash
git push heroku main
# or
railway up
```

4. **Run database migrations:**
```bash
npx prisma migrate deploy
```

5. **Seed production database:**
```bash
npm run seed
```

6. **Verify deployment:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Purchase flow works
- [ ] Video player works
- [ ] Admin panel accessible

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build                # Build for production
npm run preview              # Preview production build

# Database
npx prisma studio            # Open Prisma Studio
npx prisma migrate dev       # Run migrations (dev)
npx prisma migrate deploy    # Run migrations (prod)
npx prisma generate          # Generate Prisma Client

# Testing
npm run test                 # Run unit tests
npm run test:e2e             # Run E2E tests
npm run test:coverage        # Test coverage

# Deployment
npx wrangler pages deploy dist --project-name eyebucks  # Deploy to Cloudflare Pages
```

### File Structure

```
eyebuckz/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── GapCheckModal.tsx
│   │   └── LoadingSpinner.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Storefront.tsx
│   │   ├── CourseDetails.tsx
│   │   ├── Checkout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Learn.tsx
│   │   └── Admin.tsx
│   ├── services/
│   │   ├── authService.ts
│   │   ├── enrollmentService.ts ← CREATE THIS
│   │   └── progressService.ts ← CREATE THIS
│   ├── types.ts
│   ├── constants.ts
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── USER_FLOWS.md
│   ├── ACCESS_CONTROL.md
│   ├── DATA_ARCHITECTURE.md
│   └── IMPLEMENTATION_GUIDE.md ← YOU ARE HERE
├── server/ ← CREATE THIS (Phase 3)
│   └── api/
│       ├── auth.ts
│       ├── courses.ts
│       ├── enrollments.ts
│       ├── progress.ts
│       └── checkout.ts
├── prisma/ ← CREATE THIS (Phase 3)
│   ├── schema.prisma
│   └── seed.ts
└── package.json
```

---

*End of Implementation Guide*
