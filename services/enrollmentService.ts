/**
 * Enrollment Service - Supabase Version
 * Backward-compatible wrapper around enrollmentsApi
 */
import { enrollmentsApi } from './api';
import { Enrollment } from '../types';
import { logger } from '../utils/logger';

export const enrollmentService = {
  enrollUser: async (data: {
    userId: string;
    courseId: string;
    paymentId?: string;
    orderId?: string;
    amount: number;
  }): Promise<Enrollment> => {
    // Enrollment is now created by the checkout-verify Edge Function
    // This method exists for backward compatibility
    const enrollment = await enrollmentsApi.getEnrollment(data.courseId);
    if (!enrollment) {
      throw new Error('Enrollment not found - should be created by checkout');
    }
    return enrollment;
  },

  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
    const enrollments = await enrollmentsApi.getUserEnrollments();
    return enrollments.map(e => ({
      ...e,
      progress: {
        completedModules: e.completedModules || [],
        currentModule: e.currentModule,
        overallPercent: e.overallPercent || 0,
        totalWatchTime: e.totalWatchTime || 0,
      },
    }));
  },

  hasAccess: async (userId: string | undefined, courseId: string): Promise<boolean> => {
    if (!userId) return false;
    return enrollmentsApi.checkAccess(courseId);
  },

  getEnrollment: async (userId: string, courseId: string): Promise<Enrollment | null> => {
    return enrollmentsApi.getEnrollment(courseId);
  },

  updateLastAccess: async (userId: string, courseId: string): Promise<void> => {
    const enrollment = await enrollmentsApi.getEnrollment(courseId);
    if (enrollment) {
      await enrollmentsApi.updateLastAccess(enrollment.id);
    }
  },

  updateProgress: async (
    userId: string,
    courseId: string,
    data: Partial<Enrollment['progress']>
  ): Promise<void> => {
    const enrollment = await enrollmentsApi.getEnrollment(courseId);
    if (enrollment) {
      await enrollmentsApi.updateProgress(enrollment.id, data);
    }
  },

  checkAccess: async (userId: string, courseId: string): Promise<boolean> => {
    return enrollmentsApi.checkAccess(courseId);
  },

  isAlreadyOwned: async (userId: string, courseId: string): Promise<boolean> => {
    return enrollmentsApi.checkAccess(courseId);
  },

  getUserStats: async (userId: string) => {
    try {
      const enrollments = await enrollmentsApi.getUserEnrollments();
      return {
        totalEnrollments: enrollments.length,
        totalCompleted: enrollments.filter(e => e.overallPercent === 100).length,
        totalInProgress: enrollments.filter(
          e => e.overallPercent > 0 && e.overallPercent < 100
        ).length,
        totalWatchTime: enrollments.reduce((sum, e) => sum + e.totalWatchTime, 0),
      };
    } catch {
      return { totalEnrollments: 0, totalCompleted: 0, totalInProgress: 0, totalWatchTime: 0 };
    }
  },

  _updateCache: (_enrollment: Enrollment): void => {
    // No-op: Supabase handles persistence
  },

  _getFromCache: (_userId: string): Enrollment[] => {
    return [];
  },

  clearCache: (): void => {
    logger.debug('[Enrollment] Cache cleared (no-op in Supabase mode)');
  },
};
