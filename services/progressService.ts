/**
 * Progress Service - Supabase Version
 * Backward-compatible wrapper around progressApi
 */
import { progressApi, AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD } from './api';

interface ModuleProgress {
  moduleId: string;
  lastTimestamp: number;
  completed: boolean;
  completedAt: Date | string | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: string;
}

export const progressService = {
  saveProgress: async (
    userId: string,
    courseId: string,
    moduleId: string,
    timestamp: number
  ): Promise<void> => {
    await progressApi.saveProgress(courseId, moduleId, timestamp);
  },

  markComplete: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<void> => {
    await progressApi.markComplete(courseId, moduleId);
  },

  checkCompletion: async (
    userId: string,
    courseId: string,
    moduleId: string,
    currentTime: number,
    duration: number
  ): Promise<boolean> => {
    return progressApi.checkCompletion(courseId, moduleId, currentTime, duration);
  },

  getModuleProgress: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<ModuleProgress | null> => {
    return progressApi.getModuleProgress(courseId, moduleId);
  },

  getResumePosition: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<number> => {
    return progressApi.getResumePosition(courseId, moduleId);
  },

  updateCurrentModule: async (
    userId: string,
    courseId: string,
    moduleId: string
  ): Promise<void> => {
    await progressApi.updateCurrentModule(courseId, moduleId);
  },

  getCourseStats: async (
    userId: string,
    courseId: string
  ): Promise<{
    completedModules: number;
    totalModules: number;
    overallPercent: number;
    totalWatchTime: number;
  }> => {
    const stats = await progressApi.getCourseStats(courseId);
    return {
      completedModules: stats.completedModules,
      totalModules: stats.totalModules,
      overallPercent: stats.overallPercent,
      totalWatchTime: stats.totalWatchTime,
    };
  },

  getProgress: async (
    userId: string,
    courseId: string
  ): Promise<ModuleProgress[]> => {
    return progressApi.getProgress(courseId);
  },

  clearProgress: async (userId: string, courseId: string): Promise<void> => {
    await progressApi.clearProgress(courseId);
  },
};

export { AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD };
