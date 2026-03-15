/**
 * Global Type Definitions
 * Shared types used across the application
 */

// ============================================
// USER TYPES
// ============================================

/** Maps to `user_role` DB ENUM. All new users default to 'USER'; only DB triggers or admin actions set 'ADMIN'. */
export type Role = 'USER' | 'ADMIN';

/** User profile synced from `auth.users` via DB trigger. `phone_e164` is required by ProtectedRoute's PhoneGateModal. */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone_e164: string | null;
  role: Role;
  phoneVerified: boolean;
  emailVerified: boolean;
  google_id?: string;
  created_at?: Date;
  last_login_at?: Date;
}

// ============================================
// COURSE TYPES
// ============================================

/** BUNDLE = a collection of MODULE courses; MODULE = a standalone course with video chapters. */
export const CourseType = { BUNDLE: 'BUNDLE', MODULE: 'MODULE' } as const;
export type CourseType = (typeof CourseType)[keyof typeof CourseType];
/** PUBLISHED = visible in storefront; DRAFT = hidden from students. */
export type CourseStatus = 'PUBLISHED' | 'DRAFT';

/** Course catalog entry. `price` is in paise (₹1 = 100 paise). `slug` is UNIQUE in DB. */
export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number; // in paise
  thumbnail: string;
  heroVideoId: string | null;
  type: CourseType;
  status: CourseStatus;
  rating: number | null;
  totalStudents: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  chapters?: Array<{
    id: string;
    title: string;
    duration: string;
    durationSeconds: number;
    isCompleted?: boolean;
    videoUrl?: string;
  }>;
  reviews?: Array<{
    id: string;
    user: string;
    rating: number;
    comment: string;
    date: string;
  }>;
  bundledCourses?: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail: string;
    price: number;
    rating: number | null;
    totalStudents: number;
    moduleCount: number;
  }>;
}

export interface CourseWithModules extends Course {
  modules: Module[];
}

// ============================================
// MODULE TYPES
// ============================================

/** A video chapter within a course. `videoId` is a Bunny.net GUID (not a URL) — pass to `useVideoUrl`. */
export interface Module {
  id: string;
  courseId: string;
  title: string;
  duration: string;
  durationSeconds: number;
  videoUrl: string;
  videoId?: string;
  isFreePreview: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  hasAccess?: boolean; // Computed field for access control
}

// ============================================
// ENROLLMENT TYPES
// ============================================

/** PENDING = payment started but not yet verified; ACTIVE = paid + access granted; EXPIRED/REVOKED = no access. */
export type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';

/** User's access record for a course. `expiresAt` null = no expiry (lifetime access). */
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  lastAccessedAt: Date | null;
  status: EnrollmentStatus;
  paymentId: string | null;
  orderId: string | null;
  amount: number;
  expiresAt: Date | null;
  completedModules: string[];
  currentModule: string | null;
  overallPercent: number;
  totalWatchTime: number;
  createdAt: Date;
  updatedAt: Date;
  progress?: {
    completedModules: string[];
    currentModule: string | null;
    overallPercent: number;
    totalWatchTime: number;
  };
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

// ============================================
// PROGRESS TYPES
// ============================================

/** Per-module video watch record. `timestamp` is the last watched position in seconds. `completed` = reached 95% threshold. */
export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  moduleId: string;
  timestamp: number;
  completed: boolean;
  completedAt: Date | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: Date;
}

export interface ProgressStats {
  overallPercent: number;
  completedModules: number;
  totalModules: number;
  totalWatchTime: number;
  currentModule: string | null;
}

// ============================================
// CERTIFICATE TYPES
// ============================================

/** ACTIVE = valid certificate; REVOKED = invalidated by admin. */
export type CertificateStatus = 'ACTIVE' | 'REVOKED';

/** Course completion certificate. `downloadUrl` is a Supabase Storage public URL. `pdf_data` (in DB) is base64. */
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  issueDate: Date;
  completionDate: Date;
  downloadUrl: string | null;
  status: CertificateStatus;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
}

export interface CertificateWithRelations extends Certificate {
  user: Pick<User, 'id' | 'name' | 'email'>;
  course: Pick<Course, 'id' | 'title'>;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
}

export interface SalesDataPoint {
  date: string;
  amount: number;
}

export interface RecentEnrollment {
  id: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
  enrolledAt: Date;
}

export interface RecentCertificate {
  id: string;
  studentName: string;
  courseTitle: string;
  issueDate: Date;
}

export interface RecentActivity {
  recentEnrollments: RecentEnrollment[];
  recentCertificates: RecentCertificate[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  isActive: boolean;
  phoneVerified?: boolean;
  phoneE164?: string | null;
  enrollmentCount?: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count?: {
    enrollments: number;
    certificates: number;
  };
}

export interface AdminCourse extends Course {
  deletedAt?: string | null;
  enrollmentCount?: number;
  _count?: {
    modules: number;
    enrollments: number;
  };
}

export interface AdminCertificate {
  id: string;
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  issueDate: Date;
  status: CertificateStatus;
  revokedAt: Date | null;
  revokedReason: string | null;
  user: Pick<User, 'id' | 'name' | 'email'>;
  course: Pick<Course, 'id' | 'title'>;
}

// ============================================
// VIDEO TYPES
// ============================================

export interface VideoUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  duration: number;
  thumbnail: string;
  format: string;
  bytes?: number;
  width?: number;
  height?: number;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  courseTitle: string;
  mock?: boolean;
  message?: string;
  warning?: string;
}

export interface PaymentVerification {
  success: boolean;
  verified: boolean;
  enrollmentId: string;
  mock?: boolean;
  message?: string;
}

// ============================================
// FORM TYPES
// ============================================

export interface CourseFormData {
  title: string;
  slug: string;
  description: string;
  price: string; // String for form input, converted to number
  thumbnail: string;
  type: CourseType;
  features: string[];
  heroVideoId?: string;
}

export interface ModuleFormData {
  title: string;
  duration: string;
  videoUrl: string;
  videoId?: string;
  isFreePreview: boolean;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  phoneE164?: string;
  role?: Role;
  isActive?: boolean;
}

// ============================================
// SITE CONTENT TYPES (CMS)
// ============================================

export interface SiteContentItem {
  id: string;
  section: 'faq' | 'testimonial' | 'showcase' | 'banner' | 'settings';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PAYMENT RECORD TYPES
// ============================================

export type PaymentStatus = 'pending' | 'captured' | 'refunded' | 'failed';

// Note: Canonical Payment type is in services/api/payments.api.ts
// Use `import type { Payment } from '../services/api/payments.api'` for payment records

// ============================================
// COURSE ANALYTICS TYPES
// ============================================

export interface CourseAnalytics {
  totalEnrollments: number;
  completionRate: number;
  avgWatchTimeMinutes: number;
  revenueTotal: number;
  activeStudents30d: number;
}
