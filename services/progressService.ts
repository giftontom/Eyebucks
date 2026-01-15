import { apiClient } from './apiClient';
import { MOCK_COURSES } from '../constants';

interface ModuleProgress {
  moduleId: string;
  lastTimestamp: number;
  completed: boolean;
  completedAt: string | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: string;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const COMPLETION_THRESHOLD = 0.95; // 95% to mark as complete

/**
 * Progress Service - API Version
 * Migrated from localStorage to backend API
 */
export const progressService = {
  /**
   * Save progress checkpoint for a module
   */
  saveProgress: async (
    userId: string,
    courseId: string,
    moduleId: string,
    timestamp: number
  ): Promise<void> => {
    try {
      await apiClient.saveProgress({
        userId,
        courseId,
        moduleId,
        timestamp
      });

      console.log('[Progress] Saved:', { userId, courseId, moduleId, timestamp });
    } catch (error) {
      console.error('[Progress] Error saving progress:', error);
    }
  },

  /**
   * Mark a module as completed
   */
  markComplete: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<void> => {
    try {
      const response = await apiClient.markModuleComplete({
        userId,
        courseId,
        moduleId
      });

      console.log('[Progress] Module completed:', {
        moduleId,
        stats: response.stats
      });
    } catch (error) {
      console.error('[Progress] Error marking complete:', error);
    }
  },

  /**
   * Check if a module should be marked complete based on watch progress
   * Returns true if newly completed
   */
  checkCompletion: async (
    userId: string,
    courseId: string,
    moduleId: string,
    currentTime: number,
    duration: number
  ): Promise<boolean> => {
    if (duration === 0) return false;

    const watchPercent = currentTime / duration;

    if (watchPercent >= COMPLETION_THRESHOLD) {
      try {
        // Check if already completed
        const moduleProgress = await progressService.getModuleProgress(
          userId,
          courseId,
          moduleId
        );

        // Only mark complete if not already completed
        if (!moduleProgress || !moduleProgress.completed) {
          await progressService.markComplete(userId, courseId, moduleId);
          return true; // Was newly completed
        }
      } catch (error) {
        console.error('[Progress] Error checking completion:', error);
      }
    }

    return false;
  },

  /**
   * Get module progress
   */
  getModuleProgress: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<ModuleProgress | null> => {
    try {
      const response = await apiClient.getModuleProgress(userId, courseId, moduleId);

      if (!response.progress) return null;

      return {
        moduleId: response.progress.moduleId,
        lastTimestamp: response.progress.timestamp,
        completed: response.progress.completed,
        completedAt: response.progress.completedAt,
        watchTime: response.progress.watchTime,
        viewCount: response.progress.viewCount || 1,
        lastUpdatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Progress] Error getting module progress:', error);
      return null;
    }
  },

  /**
   * Get resume position for a module
   */
  getResumePosition: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<number> => {
    try {
      const moduleProgress = await progressService.getModuleProgress(
        userId,
        courseId,
        moduleId
      );
      return moduleProgress?.lastTimestamp || 0;
    } catch (error) {
      console.error('[Progress] Error getting resume position:', error);
      return 0;
    }
  },

  /**
   * Update current module in enrollment
   */
  updateCurrentModule: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<void> => {
    try {
      // This is handled by the enrollment service
      const { enrollmentService } = await import('./enrollmentService');
      await enrollmentService.updateProgress(userId, courseId, {
        currentModule: moduleId
      });
    } catch (error) {
      console.error('[Progress] Error updating current module:', error);
    }
  },

  /**
   * Get overall stats for a course
   */
  getCourseStats: async (
    userId: string,
    courseId: string
  ): Promise<{
    completedCount: number;
    totalModules: number;
    overallPercent: number;
    totalWatchTime: number;
  }> => {
    try {
      const response = await apiClient.getProgressStats(userId, courseId);
      return response.stats;
    } catch (error) {
      console.error('[Progress] Error getting course stats:', error);

      // Return empty stats on error
      return {
        completedCount: 0,
        totalModules: 0,
        overallPercent: 0,
        totalWatchTime: 0
      };
    }
  },

  /**
   * Get all progress for a course
   */
  getProgress: async (
    userId: string,
    courseId: string
  ): Promise<ModuleProgress[]> => {
    try {
      const response = await apiClient.getProgress(userId, courseId);

      return response.progress.map((p: any) => ({
        moduleId: p.moduleId,
        lastTimestamp: p.timestamp,
        completed: p.completed,
        completedAt: p.completedAt,
        watchTime: p.watchTime,
        viewCount: p.viewCount,
        lastUpdatedAt: p.lastUpdatedAt
      }));
    } catch (error) {
      console.error('[Progress] Error getting progress:', error);
      return [];
    }
  },

  /**
   * Clear all progress (for testing)
   */
  clearProgress: async (userId: string, courseId: string): Promise<void> => {
    try {
      await apiClient.clearProgress(userId, courseId);
      console.log('[Progress] Cleared progress for:', { userId, courseId });
    } catch (error) {
      console.error('[Progress] Error clearing progress:', error);
    }
  }
};

// Export constants for use in components
export { AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD };
