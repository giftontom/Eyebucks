/**
 * Global Type Definitions
 * Shared types used across the application
 */

// ============================================
// USER TYPES
// ============================================

/** Maps to `user_role` DB ENUM. All new users default to 'USER'; only DB triggers or admin actions set 'ADMIN'. */
export type Role = 'USER' | 'ADMIN';

/** Maps to `course_language` DB ENUM. The content language of a course + the user's storefront preference. */
export type CourseLanguage = 'EN' | 'ML';

/** Human-readable labels for each course language (EN in Latin, ML in native script). */
export const COURSE_LANGUAGE_LABELS: Record<CourseLanguage, { label: string; short: string }> = {
  EN: { label: 'English', short: 'EN' },
  ML: { label: 'മലയാളം', short: 'ML' },
};

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
  /** Preferred storefront content language. `null` = never chosen (client resolves from device/browser). */
  preferredLanguage?: CourseLanguage | null;
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
  /** Content language of this course (drives storefront language filtering). */
  language: CourseLanguage;
  /** Optional loose key linking the same course concept across languages. */
  courseGroupId?: string | null;
  rating: number | null;
  totalStudents: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  /** Curriculum outline: chapters (modules) each containing their lessons (the video leaves). */
  chapters?: Array<{
    id: string;
    title: string;
    orderIndex?: number;
    lessons: Array<{
      id: string;
      title: string;
      duration: string;
      durationSeconds: number;
      isFreePreview: boolean;
      isCompleted?: boolean;
      videoUrl?: string;
    }>;
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
    /** Total number of lessons across all chapters in the bundled course. */
    lessonCount: number;
  }>;
  /** Downloadable digital assets included in this BUNDLE (published only). */
  bundledAssets?: Array<{
    id: string;
    slug: string;
    title: string;
    thumbnail: string;
    fileType: AssetFileType;
    license: AssetLicense;
    price: number;
  }>;
}

export interface CourseWithModules extends Course {
  modules: Module[];
}

// ============================================
// MODULE TYPES (chapters) + LESSON TYPES (video leaves)
// ============================================

/** A chapter within a MODULE course. Pure grouping — holds no video; its `lessons` do. */
export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons?: Lesson[];
  createdAt: Date;
  updatedAt: Date;
}

/** A lesson within a chapter — the video-bearing leaf. `videoId` is a Bunny.net GUID
 *  (not a URL) — pass to `useVideoUrl`. */
export interface Lesson {
  id: string;
  moduleId: string;
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
  completedLessons: string[];
  currentLesson: string | null;
  overallPercent: number;
  totalWatchTime: number;
  createdAt: Date;
  updatedAt: Date;
  progress?: {
    completedLessons: string[];
    currentLesson: string | null;
    overallPercent: number;
    totalWatchTime: number;
  };
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

// ============================================
// DIGITAL ASSET TYPES (downloadable products — see ADR-008)
// ============================================

/** Kind of downloadable file. Drives the catalog file-type filter + card badge. */
export type AssetFileType =
  | 'LUT'
  | 'PRESET'
  | 'SFX'
  | 'MUSIC'
  | 'OVERLAY'
  | 'PROJECT'
  | 'PDF'
  | 'TEMPLATE'
  | 'OTHER';

/** Usage license granted with the asset. */
export type AssetLicense = 'PERSONAL' | 'COMMERCIAL' | 'EXTENDED';

/** A digital asset = a one-time-purchase downloadable product. `price` is in paise
 *  (0 = free lead-magnet). `status` reuses CourseStatus (PUBLISHED|DRAFT).
 *  SECURITY: the storefront shape deliberately OMITS the private `storage_path`; only
 *  the asset-download-url Edge Function resolves it after an entitlement check. */
export interface DigitalAsset {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number; // in paise
  comparePrice: number | null; // optional strike-through "MRP" (paise)
  fileType: AssetFileType;
  license: AssetLicense;
  fileSize: number | null; // bytes
  fileExt: string | null;
  thumbnail: string;
  previewUrl: string | null; // optional watermarked/low-res sample (public)
  version: string;
  status: CourseStatus;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
  /** Present only on already-owned assets in the user's library (computed). */
  isOwned?: boolean;
}

/** User's ownership record for a digital asset. Created server-side only (checkout
 *  Edge Function / admin) — never by the client. `status` reuses EnrollmentStatus. */
export interface AssetPurchase {
  id: string;
  userId: string;
  assetId: string;
  status: EnrollmentStatus;
  paymentId: string | null;
  orderId: string | null;
  amount: number; // paise actually paid (after coupon)
  downloadCount: number;
  lastDownloadedAt: Date | null;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetPurchaseWithAsset extends AssetPurchase {
  asset: DigitalAsset;
}

/** Admin-list shape — adds the soft-delete marker (omitted from the storefront type). */
export interface AdminDigitalAsset extends DigitalAsset {
  deletedAt: string | null;
}

// ============================================
// PROGRESS TYPES
// ============================================

/** Per-lesson video watch record. `timestamp` is the last watched position in seconds. `completed` = reached 95% threshold. */
export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestamp: number;
  completed: boolean;
  completedAt: Date | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: Date;
}

/** Course progress rollup. Counts are LESSON-based (a course is complete when all
 *  lessons are complete). Field names are kept module-flavored to match the
 *  `get_progress_stats` RPC payload — `completedModules`/`totalModules` hold lesson counts,
 *  `currentModule` holds the current lesson id. */
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
  language: CourseLanguage;
  features: string[];
  heroVideoId?: string;
}

/** Admin form for a chapter (module). Chapters group lessons and carry no video. */
export interface ModuleFormData {
  title: string;
}

/** Admin form for a lesson (the video-bearing leaf within a chapter). */
export interface LessonFormData {
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
  section:
    | 'faq'
    | 'testimonial'
    | 'showcase'
    | 'banner'
    | 'settings'
    | 'creators'
    | 'instructors'
    | 'value_cards'
    | 'hero'
    | 'hero_slides'
    | 'social_proof'
    | 'featured_copy'
    | 'how_it_works'
    | 'value_props_copy'
    | 'instructors_copy'
    | 'community_copy'
    | 'creators_copy'
    | 'pricing_copy'
    | 'closing';
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
