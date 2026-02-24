/**
 * Global Type Definitions
 * Shared types used across the application
 */

// ============================================
// USER TYPES
// ============================================

export type Role = 'USER' | 'ADMIN';

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

export const CourseType = { BUNDLE: 'BUNDLE', MODULE: 'MODULE' } as const;
export type CourseType = (typeof CourseType)[keyof typeof CourseType];
export type CourseStatus = 'PUBLISHED' | 'DRAFT';

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
}

export interface CourseWithModules extends Course {
  modules: Module[];
}

// ============================================
// MODULE TYPES
// ============================================

export interface Module {
  id: string;
  courseId: string;
  title: string;
  duration: string;
  durationSeconds: number;
  videoUrl: string;
  isFreePreview: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  hasAccess?: boolean; // Computed field for access control
}

// ============================================
// ENROLLMENT TYPES
// ============================================

export type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';

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

export type CertificateStatus = 'ACTIVE' | 'REVOKED';

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
// SESSION TYPES
// ============================================

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  expiresAt: Date;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  revokedAt: Date | null;
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
