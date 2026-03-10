/**
 * API Layer - Unified exports for all Supabase API services
 * Import from here instead of individual files
 */

export { coursesApi } from './courses.api';
export { enrollmentsApi } from './enrollments.api';
export { progressApi, AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD } from './progress.api';
export { checkoutApi } from './checkout.api';
export { adminApi } from './admin.api';
export { notificationsApi, mapNotification } from './notifications.api';
export type { Notification } from './notifications.api';
export { siteContentApi } from './siteContent.api';
export type { SiteContentItem } from '../../types';
export { paymentsApi } from './payments.api';
export type { Payment } from './payments.api';
export { certificatesApi } from './certificates.api';
export { reviewsApi } from './reviews.api';
export type { Review, ReviewSummary, ReviewsResponse } from './reviews.api';
export { usersApi, mapUserProfile } from './users.api';
export { couponsApi } from './coupons.api';
export type { Coupon } from './coupons.api';
