import { Enrollment } from '../types';
import { apiClient } from './apiClient';

/**
 * Enrollment Service - API Version
 * Migrated from localStorage to backend API
 */

// Keep localStorage key for backward compatibility / caching
const ENROLLMENTS_CACHE_KEY = 'eyebuckz_enrollments_cache';

export const enrollmentService = {
  /**
   * Create a new enrollment after successful payment
   */
  enrollUser: async (data: {
    userId: string;
    courseId: string;
    paymentId?: string;
    orderId?: string;
    amount: number;
  }): Promise<Enrollment> => {
    try {
      const response = await apiClient.createEnrollment(data);

      const enrollment: Enrollment = {
        id: response.enrollment.id,
        userId: response.enrollment.userId,
        courseId: response.enrollment.courseId,
        enrolledAt: response.enrollment.enrolledAt,
        lastAccessedAt: response.enrollment.lastAccessedAt || null,
        status: response.enrollment.status,
        paymentId: data.paymentId,
        orderId: data.orderId,
        amount: data.amount,
        expiresAt: null,
        progress: {
          completedModules: response.enrollment.progress?.completedModules || [],
          currentModule: response.enrollment.progress?.currentModule || null,
          overallPercent: response.enrollment.progress?.overallPercent || 0,
          totalWatchTime: response.enrollment.progress?.totalWatchTime || 0
        }
      };

      console.log('[Enrollment] Created:', enrollment.id, 'for user:', data.userId, 'course:', data.courseId);

      // Update cache
      enrollmentService._updateCache(enrollment);

      return enrollment;
    } catch (error) {
      console.error('[Enrollment] Error creating enrollment:', error);
      throw error;
    }
  },

  /**
   * Get all enrollments for a specific user
   */
  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
    try {
      const response = await apiClient.getUserEnrollments(userId);

      const enrollments: Enrollment[] = response.enrollments.map((e: any) => ({
        id: e.id,
        userId: userId,
        courseId: e.course.id,
        enrolledAt: e.enrolledAt,
        lastAccessedAt: e.lastAccessedAt,
        status: 'ACTIVE',
        paymentId: undefined,
        orderId: undefined,
        amount: 0,
        expiresAt: null,
        progress: {
          completedModules: e.progress?.completedModules || [],
          currentModule: e.progress?.currentModule || null,
          overallPercent: e.progress?.overallPercent || 0,
          totalWatchTime: e.progress?.totalWatchTime || 0
        }
      }));

      // Update cache
      localStorage.setItem(ENROLLMENTS_CACHE_KEY, JSON.stringify(enrollments));

      return enrollments;
    } catch (error) {
      console.error('[Enrollment] Error getting user enrollments:', error);

      // Fallback to cache
      return enrollmentService._getFromCache(userId);
    }
  },

  /**
   * Check if user has access to a specific course
   */
  hasAccess: async (userId: string | undefined, courseId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await apiClient.checkAccess(userId, courseId);
      console.log('[Enrollment] Access check:', { userId, courseId, hasAccess: response.hasAccess });
      return response.hasAccess;
    } catch (error) {
      console.error('[Enrollment] Error checking access:', error);

      // Fallback to cache
      const cached = enrollmentService._getFromCache(userId);
      return cached.some(e => e.courseId === courseId);
    }
  },

  /**
   * Get a specific enrollment
   */
  getEnrollment: async (userId: string, courseId: string): Promise<Enrollment | null> => {
    try {
      const enrollments = await enrollmentService.getUserEnrollments(userId);
      return enrollments.find(e => e.courseId === courseId) || null;
    } catch (error) {
      console.error('[Enrollment] Error getting enrollment:', error);
      return null;
    }
  },

  /**
   * Update last accessed time for a course
   */
  updateLastAccess: async (userId: string, courseId: string): Promise<void> => {
    try {
      const enrollment = await enrollmentService.getEnrollment(userId, courseId);
      if (enrollment) {
        await apiClient.updateLastAccess(enrollment.id);
        console.log('[Enrollment] Updated last access for user:', userId, 'course:', courseId);
      }
    } catch (error) {
      console.error('[Enrollment] Error updating last access:', error);
    }
  },

  /**
   * Update progress for an enrollment
   */
  updateProgress: async (
    userId: string,
    courseId: string,
    data: Partial<Enrollment['progress']>
  ): Promise<void> => {
    try {
      const enrollment = await enrollmentService.getEnrollment(userId, courseId);
      if (enrollment) {
        await apiClient.updateEnrollmentProgress(enrollment.id, data);
        console.log('[Enrollment] Updated progress for user:', userId, 'course:', courseId, data);
      }
    } catch (error) {
      console.error('[Enrollment] Error updating progress:', error);
    }
  },

  /**
   * Check if user already owns a course
   */
  isAlreadyOwned: async (userId: string, courseId: string): Promise<boolean> => {
    return enrollmentService.hasAccess(userId, courseId);
  },

  /**
   * Get enrollment statistics for a user
   */
  getUserStats: async (userId: string): Promise<{
    totalEnrollments: number;
    totalCompleted: number;
    totalInProgress: number;
    totalWatchTime: number;
  }> => {
    try {
      const enrollments = await enrollmentService.getUserEnrollments(userId);

      return {
        totalEnrollments: enrollments.length,
        totalCompleted: enrollments.filter(e => e.progress.overallPercent === 100).length,
        totalInProgress: enrollments.filter(
          e => e.progress.overallPercent > 0 && e.progress.overallPercent < 100
        ).length,
        totalWatchTime: enrollments.reduce((sum, e) => sum + e.progress.totalWatchTime, 0)
      };
    } catch (error) {
      console.error('[Enrollment] Error getting user stats:', error);
      return {
        totalEnrollments: 0,
        totalCompleted: 0,
        totalInProgress: 0,
        totalWatchTime: 0
      };
    }
  },

  // ============================================
  // CACHE MANAGEMENT (Private)
  // ============================================

  _updateCache: (enrollment: Enrollment): void => {
    try {
      const cached = localStorage.getItem(ENROLLMENTS_CACHE_KEY);
      const enrollments: Enrollment[] = cached ? JSON.parse(cached) : [];

      const index = enrollments.findIndex(e => e.id === enrollment.id);
      if (index >= 0) {
        enrollments[index] = enrollment;
      } else {
        enrollments.push(enrollment);
      }

      localStorage.setItem(ENROLLMENTS_CACHE_KEY, JSON.stringify(enrollments));
    } catch (error) {
      console.error('[Enrollment] Error updating cache:', error);
    }
  },

  _getFromCache: (userId: string): Enrollment[] => {
    try {
      const cached = localStorage.getItem(ENROLLMENTS_CACHE_KEY);
      if (!cached) return [];

      const enrollments: Enrollment[] = JSON.parse(cached);
      return enrollments.filter(e => e.userId === userId && e.status === 'ACTIVE');
    } catch (error) {
      console.error('[Enrollment] Error reading cache:', error);
      return [];
    }
  },

  /**
   * Clear cache (for testing)
   */
  clearCache: (): void => {
    localStorage.removeItem(ENROLLMENTS_CACHE_KEY);
    console.log('[Enrollment] Cache cleared');
  }
};
