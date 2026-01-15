import { enrollmentService } from './enrollmentService'
import { MOCK_COURSES } from '../constants'

interface ModuleProgress {
  moduleId: string
  lastTimestamp: number
  completed: boolean
  completedAt: string | null
  watchTime: number
  viewCount: number
  lastUpdatedAt: string
}

interface CourseProgress {
  userId: string
  courseId: string
  modules: ModuleProgress[]
  lastSyncedAt: string
}

const AUTO_SAVE_INTERVAL = 30000 // 30 seconds
const COMPLETION_THRESHOLD = 0.95 // 95% to mark as complete

export const progressService = {
  /**
   * Get localStorage key for user + course progress
   */
  getProgressKey: (userId: string, courseId: string): string => {
    return `eyebuckz_progress_${userId}_${courseId}`
  },

  /**
   * Get progress data for a course
   */
  getProgress: (userId: string, courseId: string): CourseProgress => {
    const key = progressService.getProgressKey(userId, courseId)
    const stored = localStorage.getItem(key)

    if (stored) {
      return JSON.parse(stored)
    }

    // Return empty progress structure
    return {
      userId,
      courseId,
      modules: [],
      lastSyncedAt: new Date().toISOString()
    }
  },

  /**
   * Save progress checkpoint for a module
   */
  saveProgress: (
    userId: string,
    courseId: string,
    moduleId: string,
    timestamp: number
  ): void => {
    const progress = progressService.getProgress(userId, courseId)

    // Find or create module progress
    const moduleIndex = progress.modules.findIndex(m => m.moduleId === moduleId)

    if (moduleIndex >= 0) {
      // Update existing
      progress.modules[moduleIndex].lastTimestamp = timestamp
      progress.modules[moduleIndex].watchTime += AUTO_SAVE_INTERVAL / 1000 // Add 30s
      progress.modules[moduleIndex].lastUpdatedAt = new Date().toISOString()
    } else {
      // Create new
      progress.modules.push({
        moduleId,
        lastTimestamp: timestamp,
        completed: false,
        completedAt: null,
        watchTime: AUTO_SAVE_INTERVAL / 1000, // 30s
        viewCount: 1,
        lastUpdatedAt: new Date().toISOString()
      })
    }

    progress.lastSyncedAt = new Date().toISOString()

    // Save to localStorage
    const key = progressService.getProgressKey(userId, courseId)
    localStorage.setItem(key, JSON.stringify(progress))

    console.log('[Progress] Saved:', { userId, courseId, moduleId, timestamp })
  },

  /**
   * Mark a module as completed
   */
  markComplete: (userId: string, courseId: string, moduleId: string): void => {
    const progress = progressService.getProgress(userId, courseId)

    const moduleIndex = progress.modules.findIndex(m => m.moduleId === moduleId)

    if (moduleIndex >= 0) {
      progress.modules[moduleIndex].completed = true
      progress.modules[moduleIndex].completedAt = new Date().toISOString()
    } else {
      // Create new completed module
      progress.modules.push({
        moduleId,
        lastTimestamp: 0,
        completed: true,
        completedAt: new Date().toISOString(),
        watchTime: 0,
        viewCount: 1,
        lastUpdatedAt: new Date().toISOString()
      })
    }

    // Update enrollment progress
    const course = MOCK_COURSES.find(c => c.id === courseId)
    if (course) {
      const completedCount = progress.modules.filter(m => m.completed).length
      const totalModules = course.chapters.length
      const overallPercent = Math.round((completedCount / totalModules) * 100)

      const completedModuleIds = progress.modules
        .filter(m => m.completed)
        .map(m => m.moduleId)

      enrollmentService.updateProgress(userId, courseId, {
        completedModules: completedModuleIds,
        currentModule: moduleId,
        overallPercent
      })

      console.log('[Progress] Module completed:', {
        moduleId,
        completedCount,
        totalModules,
        overallPercent
      })
    }

    // Save to localStorage
    const key = progressService.getProgressKey(userId, courseId)
    localStorage.setItem(key, JSON.stringify(progress))
  },

  /**
   * Check if a module should be marked complete based on watch progress
   */
  checkCompletion: (
    userId: string,
    courseId: string,
    moduleId: string,
    currentTime: number,
    duration: number
  ): boolean => {
    if (duration === 0) return false

    const watchPercent = currentTime / duration

    if (watchPercent >= COMPLETION_THRESHOLD) {
      const progress = progressService.getProgress(userId, courseId)
      const module = progress.modules.find(m => m.moduleId === moduleId)

      // Only mark complete if not already completed
      if (!module || !module.completed) {
        progressService.markComplete(userId, courseId, moduleId)
        return true // Was newly completed
      }
    }

    return false
  },

  /**
   * Get module progress
   */
  getModuleProgress: (
    userId: string,
    courseId: string,
    moduleId: string
  ): ModuleProgress | null => {
    const progress = progressService.getProgress(userId, courseId)
    return progress.modules.find(m => m.moduleId === moduleId) || null
  },

  /**
   * Get resume position for a module
   */
  getResumePosition: (
    userId: string,
    courseId: string,
    moduleId: string
  ): number => {
    const moduleProgress = progressService.getModuleProgress(userId, courseId, moduleId)
    return moduleProgress?.lastTimestamp || 0
  },

  /**
   * Update current module in enrollment
   */
  updateCurrentModule: (
    userId: string,
    courseId: string,
    moduleId: string
  ): void => {
    enrollmentService.updateProgress(userId, courseId, {
      currentModule: moduleId
    })
  },

  /**
   * Get overall stats for a course
   */
  getCourseStats: (userId: string, courseId: string) => {
    const progress = progressService.getProgress(userId, courseId)
    const course = MOCK_COURSES.find(c => c.id === courseId)

    if (!course) {
      return {
        completedCount: 0,
        totalModules: 0,
        overallPercent: 0,
        totalWatchTime: 0
      }
    }

    const completedCount = progress.modules.filter(m => m.completed).length
    const totalModules = course.chapters.length
    const overallPercent = totalModules > 0
      ? Math.round((completedCount / totalModules) * 100)
      : 0
    const totalWatchTime = progress.modules.reduce((sum, m) => sum + m.watchTime, 0)

    return {
      completedCount,
      totalModules,
      overallPercent,
      totalWatchTime
    }
  },

  /**
   * Clear all progress (for testing)
   */
  clearProgress: (userId: string, courseId: string): void => {
    const key = progressService.getProgressKey(userId, courseId)
    localStorage.removeItem(key)
    console.log('[Progress] Cleared progress for:', { userId, courseId })
  },

  /**
   * Clear all progress for all courses (for testing)
   */
  clearAllProgress: (): void => {
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('eyebuckz_progress_')
    )
    keys.forEach(key => localStorage.removeItem(key))
    console.log('[Progress] Cleared all progress data')
  }
}

// Export constants for use in components
export { AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD }
