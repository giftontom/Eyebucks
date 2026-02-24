/**
 * API Layer - Unified exports for all Supabase API services
 * Import from here instead of individual files
 */

export { coursesApi } from './courses.api';
export { enrollmentsApi } from './enrollments.api';
export { progressApi, AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD } from './progress.api';
export { checkoutApi } from './checkout.api';
export { adminApi } from './admin.api';
export { notificationsApi } from './notifications.api';
export type { Notification } from './notifications.api';
