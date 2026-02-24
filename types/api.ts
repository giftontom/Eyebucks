/**
 * API Request and Response Types
 * Type-safe API client interfaces
 */

import type {
  User,
  Course,
  Module,
  Enrollment,
  EnrollmentWithCourse,
  Progress,
  ProgressStats,
  Certificate,
  CertificateWithRelations,
  AdminStats,
  SalesDataPoint,
  RecentActivity,
  VideoUploadResult,
  PaymentOrder,
  PaymentVerification,
  Session
} from './index';

// ============================================
// GENERIC API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// AUTH API
// ============================================

export interface LoginWithGoogleRequest {
  credential: string;
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
}

export interface UpdatePhoneRequest {
  userId: string;
  phone: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  expiresIn: number;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface SessionsResponse {
  success: boolean;
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    deviceInfo: string | null;
    lastActivity: Date;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }>;
}

// ============================================
// COURSE API
// ============================================

export interface GetCoursesResponse {
  success: boolean;
  courses: Course[];
}

export interface GetCourseResponse {
  success: boolean;
  course: Course;
}

export interface GetCourseModulesRequest {
  courseId: string;
  userId?: string;
}

export interface GetCourseModulesResponse {
  success: boolean;
  modules: Module[];
}

// ============================================
// ENROLLMENT API
// ============================================

export interface GetUserEnrollmentsRequest {
  userId: string;
}

export interface GetUserEnrollmentsResponse {
  success: boolean;
  enrollments: EnrollmentWithCourse[];
}

export interface CheckEnrollmentRequest {
  userId: string;
  courseId: string;
}

export interface CheckEnrollmentResponse {
  success: boolean;
  enrolled: boolean;
  enrollment?: Enrollment;
}

export interface CreateEnrollmentRequest {
  userId: string;
  courseId: string;
  paymentId: string;
  orderId: string;
  amount: number;
}

export interface CreateEnrollmentResponse {
  success: boolean;
  enrollment: Enrollment;
}

// ============================================
// PROGRESS API
// ============================================

export interface UpdateProgressRequest {
  userId: string;
  courseId: string;
  moduleId: string;
  timestamp: number;
  completed?: boolean;
}

export interface UpdateProgressResponse {
  success: boolean;
  progress: Progress;
}

export interface GetProgressRequest {
  userId: string;
  courseId: string;
  moduleId: string;
}

export interface GetProgressResponse {
  success: boolean;
  progress: Progress | null;
}

export interface GetCourseProgressRequest {
  userId: string;
  courseId: string;
}

export interface GetCourseProgressResponse {
  success: boolean;
  progress: Progress[];
  stats: ProgressStats;
}

// ============================================
// CERTIFICATE API
// ============================================

export interface GetCertificatesRequest {
  userId: string;
}

export interface GetCertificatesResponse {
  success: boolean;
  certificates: Certificate[];
}

export interface GetCertificateByNumberRequest {
  certificateNumber: string;
}

export interface GetCertificateByNumberResponse {
  success: boolean;
  certificate: Certificate | null;
}

// ============================================
// CHECKOUT API
// ============================================

export interface CreateOrderRequest {
  courseId: string;
  userId: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  courseTitle: string;
  mock?: boolean;
  message?: string;
  warning?: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature?: string;
  courseId: string;
  userId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  enrollmentId: string;
  mock?: boolean;
  message?: string;
}

export interface CheckOrderStatusRequest {
  orderId: string;
}

export interface CheckOrderStatusResponse {
  success: boolean;
  status: 'pending' | 'completed';
  enrollment?: {
    id: string;
    courseId: string;
    courseTitle: string;
    enrolledAt: Date;
  };
}

// ============================================
// ADMIN API
// ============================================

export interface GetAdminStatsResponse {
  success: boolean;
  stats: AdminStats;
}

export interface GetAdminSalesRequest {
  days?: number;
}

export interface GetAdminSalesResponse {
  success: boolean;
  sales: SalesDataPoint[];
}

export interface GetAdminRecentActivityRequest {
  limit?: number;
}

export interface GetAdminRecentActivityResponse {
  success: boolean;
  activity: RecentActivity;
}

export interface GetAdminUsersRequest {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GetAdminUsersResponse {
  success: boolean;
  users: Array<User & { enrollmentCount: number }>;
  total: number;
}

export interface GetAdminUserRequest {
  userId: string;
}

export interface GetAdminUserResponse {
  success: boolean;
  user: User;
  enrollments: EnrollmentWithCourse[];
}

export interface UpdateAdminUserRequest {
  userId: string;
  data: {
    role?: 'USER' | 'ADMIN';
    isActive?: boolean;
  };
}

export interface UpdateAdminUserResponse {
  success: boolean;
  user: User;
}

export interface EnrollUserRequest {
  userId: string;
  courseId: string;
}

export interface EnrollUserResponse {
  success: boolean;
  enrollment: Enrollment;
}

export interface GetAdminCoursesResponse {
  success: boolean;
  courses: Array<Course & { enrollmentCount: number }>;
}

export interface CreateCourseRequest {
  title: string;
  slug: string;
  description: string;
  price: number;
  thumbnail: string;
  type: 'MODULE' | 'BUNDLE';
  features: string[];
  heroVideoId?: string;
}

export interface CreateCourseResponse {
  success: boolean;
  course: Course;
}

export interface UpdateCourseRequest {
  courseId: string;
  data: Partial<CreateCourseRequest>;
}

export interface UpdateCourseResponse {
  success: boolean;
  course: Course;
}

export interface DeleteCourseRequest {
  courseId: string;
}

export interface DeleteCourseResponse {
  success: boolean;
  message: string;
}

export interface PublishCourseRequest {
  courseId: string;
  status: 'PUBLISHED' | 'DRAFT';
}

export interface PublishCourseResponse {
  success: boolean;
  course: Course;
}

export interface GetCourseModulesAdminRequest {
  courseId: string;
}

export interface GetCourseModulesAdminResponse {
  success: boolean;
  modules: Module[];
}

export interface CreateModuleRequest {
  courseId: string;
  title: string;
  duration: string;
  videoUrl: string;
  isFreePreview: boolean;
}

export interface CreateModuleResponse {
  success: boolean;
  module: Module;
}

export interface UpdateModuleRequest {
  courseId: string;
  moduleId: string;
  data: Partial<{
    title: string;
    duration: string;
    videoUrl: string;
    isFreePreview: boolean;
    orderIndex: number;
  }>;
}

export interface UpdateModuleResponse {
  success: boolean;
  module: Module;
}

export interface ReorderModulesRequest {
  courseId: string;
  moduleIds: string[];
}

export interface ReorderModulesResponse {
  success: boolean;
  modules: Module[];
}

export interface DeleteModuleRequest {
  courseId: string;
  moduleId: string;
}

export interface DeleteModuleResponse {
  success: boolean;
  message: string;
}

export interface GetAdminCertificatesRequest {
  limit?: number;
  offset?: number;
}

export interface GetAdminCertificatesResponse {
  success: boolean;
  certificates: CertificateWithRelations[];
  total: number;
}

export interface IssueCertificateRequest {
  userId: string;
  courseId: string;
}

export interface IssueCertificateResponse {
  success: boolean;
  certificate: Certificate;
}

export interface RevokeCertificateRequest {
  certificateId: string;
  reason: string;
}

export interface RevokeCertificateResponse {
  success: boolean;
  certificate: Certificate;
}

export interface UploadVideoRequest {
  file: File;
}

export interface UploadVideoResponse {
  success: boolean;
  video: VideoUploadResult;
  mock?: boolean;
  message?: string;
}

// ============================================
// VIDEO API
// ============================================

export interface GetVideoTokenRequest {
  videoId: string;
  userId: string;
}

export interface GetVideoTokenResponse {
  success: boolean;
  token: string;
  expiresAt: number;
}

// ============================================
// ERROR RESPONSE
// ============================================

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
