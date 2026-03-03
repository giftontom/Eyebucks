# 🗄️ Eyebuckz LMS - Data Architecture Documentation

## Table of Contents
1. [Current Data Storage (localStorage)](#current-data-storage-localstorage)
2. [Required Data Models](#required-data-models)
3. [Database Schema (Production)](#database-schema-production)
4. [API Endpoints Specification](#api-endpoints-specification)
5. [State Management](#state-management)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Migration Strategy](#migration-strategy)

---

## Current Data Storage (localStorage)

### Existing Keys

#### 1. `eyebuckz_user`
**Type:** JSON string
**Purpose:** Store authenticated user data
**Structure:**
```typescript
{
  id: string              // User unique ID
  name: string            // Full name
  email: string           // Email address
  phone_e164?: string     // Phone in E.164 format (optional initially)
  avatar: string          // Profile image URL
  role: 'USER' | 'ADMIN'  // Authorization level
  google_id?: string      // OAuth provider ID
}
```

**Example:**
```json
{
  "id": "u_123",
  "name": "Demo User",
  "email": "demo@example.com",
  "phone_e164": "+15551234567",
  "avatar": "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200",
  "role": "USER",
  "google_id": "g_12345"
}
```

---

#### 2. `eyebuckz_session_token`
**Type:** String
**Purpose:** Client-side session identifier for concurrent login detection
**Structure:**
```
token_{timestamp}_{random}
```

**Example:**
```
token_1704441234567_x8k2p9
```

**Lifespan:** Until logout or concurrent login invalidation

---

### Missing Keys (TO IMPLEMENT)

#### 3. `eyebuckz_enrollments` (CRITICAL)
**Type:** JSON array
**Purpose:** Store course enrollments and progress
**Structure:**
```typescript
Array<{
  id: string                    // Enrollment unique ID
  userId: string                // Foreign key to user
  courseId: string              // Foreign key to course
  enrolledAt: string            // ISO timestamp
  lastAccessedAt: string | null // Last access time
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  paymentId?: string            // Payment gateway ID
  orderId?: string              // Order ID
  amount: number                // Price paid
  expiresAt?: string | null     // Subscription expiry (optional)
  progress: {
    completedModules: string[]  // Array of completed module IDs
    currentModule: string | null// Last watched module ID
    overallPercent: number       // 0-100
    totalWatchTime: number       // Total seconds watched
  }
}>
```

**Example:**
```json
[
  {
    "id": "enr_1704441234567",
    "userId": "u_123",
    "courseId": "c1-masterclass",
    "enrolledAt": "2026-01-05T08:30:00.000Z",
    "lastAccessedAt": "2026-01-05T14:15:30.000Z",
    "status": "ACTIVE",
    "paymentId": "pay_xyz123",
    "orderId": "order_abc456",
    "amount": 14999,
    "progress": {
      "completedModules": ["m1"],
      "currentModule": "m2",
      "overallPercent": 35,
      "totalWatchTime": 5400
    }
  }
]
```

---

#### 4. `eyebuckz_progress_{userId}_{courseId}`
**Type:** JSON object
**Purpose:** Detailed module-level progress tracking
**Structure:**
```typescript
{
  userId: string
  courseId: string
  modules: Array<{
    moduleId: string          // Module unique ID
    lastTimestamp: number     // Last playback position (seconds)
    completed: boolean        // Marked complete (95%+)
    completedAt: string | null// ISO timestamp when completed
    watchTime: number         // Total seconds watched this module
    viewCount: number         // How many times started
  }>
  lastSyncedAt: string        // Last time synced to server
}
```

**Example:**
```json
{
  "userId": "u_123",
  "courseId": "c1-masterclass",
  "modules": [
    {
      "moduleId": "m1",
      "lastTimestamp": 2700,
      "completed": true,
      "completedAt": "2026-01-05T09:15:00.000Z",
      "watchTime": 2850,
      "viewCount": 1
    },
    {
      "moduleId": "m2",
      "lastTimestamp": 845,
      "completed": false,
      "completedAt": null,
      "watchTime": 1200,
      "viewCount": 2
    }
  ],
  "lastSyncedAt": "2026-01-05T14:30:00.000Z"
}
```

---

#### 5. `eyebuckz_notes_{userId}_{moduleId}`
**Type:** String
**Purpose:** Per-module user notes
**Structure:** Plain text

**Example:**
```
Key insight: 180-degree rule ensures spatial consistency.
Remember to always establish geography first.
```

---

## Required Data Models

### User Model

```typescript
interface User {
  id: string
  name: string
  email: string
  phone_e164?: string
  avatar: string
  role: 'USER' | 'ADMIN'
  google_id?: string
  createdAt: string
  updatedAt: string
}

// Validation
const userSchema = z.object({
  email: z.string().email(),
  phone_e164: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  role: z.enum(['USER', 'ADMIN'])
})
```

---

### Course Model

```typescript
interface Course {
  id: string
  slug: string                  // URL-friendly identifier
  title: string
  description: string
  price: number                 // In paise/cents (₹14,999 = 1499900)
  thumbnail: string             // Image URL
  heroVideoId?: string          // Trailer video
  type: CourseType              // BUNDLE or MODULE
  status: CourseStatus          // PUBLISHED or DRAFT
  chapters: Module[]            // Array of modules
  features: string[]            // Bullet points
  rating?: number               // Average rating (0-5)
  totalStudents?: number        // Enrollment count
  reviews?: Review[]
  createdAt: string
  updatedAt: string
  publishedAt?: string | null
}

enum CourseType {
  BUNDLE = 'BUNDLE',
  MODULE = 'MODULE'
}

type CourseStatus = 'PUBLISHED' | 'DRAFT'
```

---

### Module Model

```typescript
interface Module {
  id: string
  title: string
  duration: string              // Human-readable (e.g., "45:00")
  durationSeconds: number       // Machine-readable
  isCompleted: boolean          // User-specific (computed)
  videoUrl: string              // Video source URL
  isFreePreview?: boolean       // Allow non-enrolled users to watch
  order: number                 // Display order
  description?: string
  transcript?: string           // Video transcript (optional)
  resources?: Resource[]        // Downloadable files
}

interface Resource {
  id: string
  title: string
  type: 'PDF' | 'ZIP' | 'LINK' | 'IMAGE'
  url: string
  size?: number                 // File size in bytes
}
```

---

### Enrollment Model

```typescript
interface Enrollment {
  id: string
  userId: string
  courseId: string
  enrolledAt: string            // ISO timestamp
  lastAccessedAt: string | null
  status: EnrollmentStatus
  paymentId?: string
  orderId?: string
  amount: number
  expiresAt?: string | null     // For subscription-based courses
  progress: Progress
  createdAt: string
  updatedAt: string
}

type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING'

interface Progress {
  completedModules: string[]    // Array of module IDs
  currentModule: string | null  // Last watched module
  overallPercent: number        // 0-100
  totalWatchTime: number        // Total seconds across all modules
}
```

---

### Progress Model (Detailed)

```typescript
interface ProgressRecord {
  id: string
  userId: string
  courseId: string
  moduleId: string
  timestamp: number             // Last playback position (seconds)
  completed: boolean
  completedAt: string | null
  watchTime: number             // Total time watched
  viewCount: number             // Number of times started
  lastUpdatedAt: string
}

// Aggregate Progress
interface CourseProgress {
  userId: string
  courseId: string
  modules: ModuleProgress[]
  overallPercent: number
  completedCount: number
  totalModules: number
  lastSyncedAt: string
}

interface ModuleProgress {
  moduleId: string
  lastTimestamp: number
  completed: boolean
  completedAt: string | null
  watchTime: number
  viewCount: number
}
```

---

### Review Model

```typescript
interface Review {
  id: string
  userId: string
  courseId: string
  rating: number                // 1-5
  comment: string
  date: string                  // ISO timestamp
  helpful: number               // Upvote count
  userName?: string             // Denormalized for display
  userAvatar?: string
  createdAt: string
  updatedAt: string
}
```

---

### Payment Model

```typescript
interface Payment {
  id: string
  userId: string
  courseId: string
  orderId: string               // Razorpay order ID
  paymentId: string             // Razorpay payment ID
  signature: string             // Razorpay signature
  amount: number                // In paise/cents
  currency: string              // INR, USD, etc.
  status: PaymentStatus
  method: string                // card, upi, netbanking, etc.
  createdAt: string
  capturedAt?: string | null
  failedAt?: string | null
  errorCode?: string | null
  errorDescription?: string | null
}

type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED'
```

---

### Certificate Model

```typescript
interface Certificate {
  id: string
  userId: string
  courseId: string
  certificateNumber: string     // Unique certificate number
  studentName: string
  courseTitle: string
  issueDate: string
  completionDate: string
  downloadUrl: string           // PDF URL
  status: 'ACTIVE' | 'REVOKED'
  revokedAt?: string | null
  revokedReason?: string | null
  createdAt: string
}
```

---

## Database Schema (Production)

### PostgreSQL Schema

```sql
-- Users Table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_e164 VARCHAR(20),
  avatar TEXT,
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  google_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Courses Table
CREATE TABLE courses (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in paise/cents
  thumbnail TEXT,
  hero_video_id VARCHAR(100),
  type VARCHAR(20) CHECK (type IN ('BUNDLE', 'MODULE')),
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('PUBLISHED', 'DRAFT')),
  rating DECIMAL(3,2),
  total_students INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_status ON courses(status);

-- Modules Table
CREATE TABLE modules (
  id VARCHAR(50) PRIMARY KEY,
  course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  duration VARCHAR(20),
  duration_seconds INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  is_free_preview BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  description TEXT,
  transcript TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_modules_course_id ON modules(course_id);

-- Enrollments Table
CREATE TABLE enrollments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING')),
  payment_id VARCHAR(100),
  order_id VARCHAR(100),
  amount INTEGER NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Progress Table
CREATE TABLE progress (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
  module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
  timestamp INTEGER DEFAULT 0, -- seconds
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  watch_time INTEGER DEFAULT 0, -- seconds
  view_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id, module_id)
);

CREATE INDEX idx_progress_user_course ON progress(user_id, course_id);
CREATE INDEX idx_progress_module ON progress(module_id);

-- Reviews Table
CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_reviews_course_id ON reviews(course_id);

-- Payments Table
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  course_id VARCHAR(50) REFERENCES courses(id),
  order_id VARCHAR(100) NOT NULL,
  payment_id VARCHAR(100),
  signature VARCHAR(500),
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'CREATED',
  method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  captured_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_code VARCHAR(100),
  error_description TEXT
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Certificates Table
CREATE TABLE certificates (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  course_title VARCHAR(500) NOT NULL,
  issue_date DATE NOT NULL,
  completion_date DATE NOT NULL,
  download_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_cert_number ON certificates(certificate_number);

-- Sessions Table (for session management)
CREATE TABLE sessions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Notes Table
CREATE TABLE notes (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

CREATE INDEX idx_notes_user_module ON notes(user_id, module_id);
```

---

## API Endpoints Specification

### Authentication Endpoints

#### `POST /api/auth/google`
**Description:** Handle Google OAuth callback
**Request Body:**
```json
{
  "code": "oauth_authorization_code"
}
```
**Response:**
```json
{
  "user": {
    "id": "u_123",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "role": "USER"
  },
  "token": "jwt_token_here",
  "expiresIn": 604800
}
```

---

#### `POST /api/auth/update-phone`
**Description:** Update user phone number (Gap Check)
**Auth Required:** Yes
**Request Body:**
```json
{
  "phone": "+15551234567"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Phone number updated"
}
```

---

#### `POST /api/auth/logout`
**Description:** Invalidate session
**Auth Required:** Yes
**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/me`
**Description:** Get current user
**Auth Required:** Yes
**Response:**
```json
{
  "user": {
    "id": "u_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_e164": "+15551234567",
    "avatar": "https://...",
    "role": "USER"
  }
}
```

---

### Course Endpoints

#### `GET /api/courses`
**Description:** Get all published courses
**Query Params:**
- `type`: 'BUNDLE' | 'MODULE' (optional)
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```json
{
  "courses": [
    {
      "id": "c1-masterclass",
      "slug": "complete-content-creation-masterclass",
      "title": "Complete Content Creation Masterclass",
      "description": "...",
      "price": 1499900,
      "thumbnail": "https://...",
      "type": "BUNDLE",
      "rating": 5.0,
      "totalStudents": 4200
    }
  ],
  "total": 4,
  "hasMore": false
}
```

---

#### `GET /api/courses/:id`
**Description:** Get single course details
**Response:**
```json
{
  "course": {
    "id": "c1-masterclass",
    "slug": "complete-content-creation-masterclass",
    "title": "Complete Content Creation Masterclass",
    "description": "...",
    "price": 1499900,
    "thumbnail": "https://...",
    "type": "BUNDLE",
    "status": "PUBLISHED",
    "chapters": [
      {
        "id": "m1",
        "title": "Module 1: Selecting Niche...",
        "duration": "45:00",
        "durationSeconds": 2700,
        "isFreePreview": false
      }
    ],
    "features": ["7-Module System", "..."],
    "rating": 5.0,
    "totalStudents": 4200,
    "reviews": [...]
  }
}
```

---

### Enrollment Endpoints

#### `POST /api/enrollments`
**Description:** Create enrollment (after payment)
**Auth Required:** Yes
**Request Body:**
```json
{
  "courseId": "c1-masterclass",
  "paymentId": "pay_xyz123",
  "orderId": "order_abc456",
  "amount": 1499900
}
```
**Response:**
```json
{
  "enrollment": {
    "id": "enr_1704441234567",
    "userId": "u_123",
    "courseId": "c1-masterclass",
    "enrolledAt": "2026-01-05T08:30:00.000Z",
    "status": "ACTIVE"
  }
}
```

---

#### `GET /api/enrollments/user/:userId`
**Description:** Get all user enrollments
**Auth Required:** Yes (own enrollments or admin)
**Response:**
```json
{
  "enrollments": [
    {
      "id": "enr_1704441234567",
      "userId": "u_123",
      "course": {
        "id": "c1-masterclass",
        "title": "Complete Content Creation Masterclass",
        "thumbnail": "https://..."
      },
      "enrolledAt": "2026-01-05T08:30:00.000Z",
      "lastAccessedAt": "2026-01-05T14:15:30.000Z",
      "progress": {
        "overallPercent": 35,
        "completedModules": ["m1"],
        "currentModule": "m2"
      }
    }
  ]
}
```

---

#### `GET /api/enrollments/check/:courseId`
**Description:** Check if current user is enrolled
**Auth Required:** Yes
**Response:**
```json
{
  "enrolled": true,
  "enrollmentId": "enr_1704441234567"
}
```

---

### Progress Endpoints

#### `GET /api/progress/:userId/:courseId`
**Description:** Get user progress for a course
**Auth Required:** Yes (own progress or admin)
**Response:**
```json
{
  "progress": {
    "userId": "u_123",
    "courseId": "c1-masterclass",
    "modules": [
      {
        "moduleId": "m1",
        "lastTimestamp": 2700,
        "completed": true,
        "completedAt": "2026-01-05T09:15:00.000Z",
        "watchTime": 2850,
        "viewCount": 1
      },
      {
        "moduleId": "m2",
        "lastTimestamp": 845,
        "completed": false,
        "watchTime": 1200,
        "viewCount": 2
      }
    ],
    "overallPercent": 35,
    "lastSyncedAt": "2026-01-05T14:30:00.000Z"
  }
}
```

---

#### `POST /api/progress`
**Description:** Save progress checkpoint
**Auth Required:** Yes
**Request Body:**
```json
{
  "courseId": "c1-masterclass",
  "moduleId": "m2",
  "timestamp": 845,
  "completed": false
}
```
**Response:**
```json
{
  "success": true,
  "progress": {
    "moduleId": "m2",
    "lastTimestamp": 845,
    "completed": false,
    "lastUpdatedAt": "2026-01-05T14:30:00.000Z"
  }
}
```

---

#### `POST /api/progress/complete`
**Description:** Mark module as complete
**Auth Required:** Yes
**Request Body:**
```json
{
  "courseId": "c1-masterclass",
  "moduleId": "m2"
}
```
**Response:**
```json
{
  "success": true,
  "overallPercent": 50,
  "certificateEligible": false
}
```

---

### Payment Endpoints

#### `POST /api/checkout/create-order`
**Description:** Create Razorpay order
**Auth Required:** Yes
**Request Body:**
```json
{
  "courseId": "c1-masterclass",
  "amount": 1499900,
  "currency": "INR"
}
```
**Response:**
```json
{
  "orderId": "order_abc456",
  "amount": 1499900,
  "currency": "INR",
  "key": "rzp_test_..."
}
```

---

#### `POST /api/webhooks/razorpay`
**Description:** Handle Razorpay webhook events
**Auth Required:** Signature verification
**Headers:**
```
x-razorpay-signature: signature_hash
```
**Request Body:**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xyz123",
        "order_id": "order_abc456",
        "amount": 1499900,
        "status": "captured"
      }
    }
  }
}
```
**Response:**
```json
{
  "success": true
}
```

---

### Video Endpoints

#### `GET /api/videos/:moduleId/signed-url`
**Description:** Get signed video URL (with expiry)
**Auth Required:** Yes + Enrollment check
**Response:**
```json
{
  "url": "https://cdn.eyebuckz.com/videos/m2.mp4?user=u_123&expires=1704444834&sig=abc123...",
  "expiresIn": 3600
}
```

---

### Admin Endpoints

#### `GET /api/admin/analytics`
**Description:** Get platform analytics
**Auth Required:** Admin only
**Response:**
```json
{
  "totalSales": 120000,
  "activeLearners": 842,
  "totalCourses": 4,
  "certificatesIssued": 128,
  "salesData": [
    { "date": "2026-01", "amount": 25000 },
    { "date": "2026-02", "amount": 32000 }
  ]
}
```

---

#### `POST /api/admin/courses`
**Description:** Create new course
**Auth Required:** Admin only
**Request Body:** (Course object)

---

#### `PUT /api/admin/courses/:id`
**Description:** Update course
**Auth Required:** Admin only

---

#### `DELETE /api/admin/courses/:id`
**Description:** Delete course
**Auth Required:** Admin only

---

## State Management

### React Context (Current)

#### AuthContext
```typescript
interface AuthContextType {
  user: User | null
  login: () => Promise<void>
  adminLogin: () => Promise<void>
  logout: () => void
  updatePhoneNumber: (phone: string) => Promise<void>
  isGapCheckRequired: boolean
}
```

### Recommended: Zustand Store (Future)

```typescript
// stores/useAuthStore.ts
import create from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: User | null
  token: string | null
  isGapCheckRequired: boolean
  login: (userData: User, token: string) => void
  logout: () => void
  updatePhone: (phone: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isGapCheckRequired: false,
      login: (user, token) => set({
        user,
        token,
        isGapCheckRequired: !user.phone_e164
      }),
      logout: () => set({ user: null, token: null, isGapCheckRequired: false }),
      updatePhone: (phone) => set(state => ({
        user: state.user ? { ...state.user, phone_e164: phone } : null,
        isGapCheckRequired: false
      }))
    }),
    { name: 'eyebuckz-auth' }
  )
)
```

---

## Data Flow Diagrams

### Enrollment Creation Flow

```
User Completes Payment
    ↓
Razorpay Webhook → POST /api/webhooks/razorpay
    ↓
Verify Signature
    ↓
Create Payment Record → payments table
    ↓
Create Enrollment → enrollments table
    ↓
Initialize Progress → progress table (empty)
    ↓
Update Course Stats → courses.total_students++
    ↓
Send Confirmation Email
    ↓
Return Success → Frontend redirects to /dashboard
```

---

### Progress Tracking Flow

```
Video Player Playing
    ↓
Auto-save every 30s → Debounced API call
    ↓
POST /api/progress
    ↓
Update progress table → SET timestamp, watch_time++
    ↓
Video reaches 95% → Mark complete
    ↓
POST /api/progress/complete
    ↓
Update progress table → SET completed=true, completed_at=NOW()
    ↓
Update enrollments table → completedModules array, overallPercent
    ↓
Check if all modules complete → Eligible for certificate
    ↓
If 100% → Generate Certificate → certificates table
    ↓
Show Completion Modal → Download certificate
```

---

### Access Control Flow

```
User Requests /learn/:id
    ↓
Check Auth → user !== null?
    ↓ No → Redirect to /
    ↓ Yes
    ↓
Check Enrollment → GET /api/enrollments/check/:courseId
    ↓ Not Enrolled → Redirect to /checkout/:id
    ↓ Enrolled
    ↓
Load Course Data → GET /api/courses/:id
    ↓
Load Progress → GET /api/progress/:userId/:courseId
    ↓
Get Signed Video URL → GET /api/videos/:moduleId/signed-url
    ↓
Render Video Player → Set video src with signed URL
    ↓
Update Last Access → POST /api/enrollments/update-access
```

---

## Migration Strategy

### Phase 1: MVP (localStorage only)
**Duration:** 1-2 weeks
**Goal:** Get system working with local storage

- [x] User auth (localStorage)
- [x] Session tokens (localStorage)
- [ ] Enrollments (localStorage)
- [ ] Progress tracking (localStorage)
- [ ] Notes (localStorage)

**Pros:**
- Fast development
- No backend needed
- Works offline

**Cons:**
- Data lost if user clears cache
- No cross-device sync
- No analytics

---

### Phase 2: Hybrid (localStorage + Backend Sync)
**Duration:** 2-3 weeks
**Goal:** Add backend persistence while keeping localStorage cache

```typescript
// Sync strategy
const syncToBackend = async (localData: any) => {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(localData)
    })
    localStorage.setItem('lastSyncedAt', new Date().toISOString())
  } catch (error) {
    // Queue for retry
    queueFailedSync(localData)
  }
}

// Load from backend on login
const loadFromBackend = async () => {
  const response = await fetch('/api/user-data')
  const backendData = await response.json()

  // Merge with local data (backend takes precedence)
  const merged = mergeSyncData(localData, backendData)
  localStorage.setItem('eyebuckz_enrollments', JSON.stringify(merged))
}
```

---

### Phase 3: Full Backend Migration
**Duration:** 3-4 weeks
**Goal:** Remove localStorage dependency, use backend as single source of truth

- Set up PostgreSQL database
- Implement all API endpoints
- Add Redis for session management
- Implement real-time sync (WebSockets)
- Add offline support (Service Workers)

---

*End of Data Architecture Documentation*
