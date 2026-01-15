import { Enrollment } from '../types'

const ENROLLMENTS_KEY = 'eyebuckz_enrollments'

export const enrollmentService = {
  /**
   * Create a new enrollment after successful payment
   */
  enrollUser: (data: {
    userId: string
    courseId: string
    paymentId?: string
    orderId?: string
    amount: number
  }): Enrollment => {
    const enrollment: Enrollment = {
      id: `enr_${Date.now()}`,
      userId: data.userId,
      courseId: data.courseId,
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: null,
      status: 'ACTIVE',
      paymentId: data.paymentId,
      orderId: data.orderId,
      amount: data.amount,
      expiresAt: null,
      progress: {
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      }
    }

    // Save to localStorage
    const enrollments = enrollmentService.getAll()
    enrollments.push(enrollment)
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments))

    console.log('[Enrollment] Created:', enrollment.id, 'for user:', data.userId, 'course:', data.courseId)
    return enrollment
  },

  /**
   * Get all enrollments from storage
   */
  getAll: (): Enrollment[] => {
    const stored = localStorage.getItem(ENROLLMENTS_KEY)
    return stored ? JSON.parse(stored) : []
  },

  /**
   * Get all enrollments for a specific user
   */
  getUserEnrollments: (userId: string): Enrollment[] => {
    const all = enrollmentService.getAll()
    return all.filter(e => e.userId === userId && e.status === 'ACTIVE')
  },

  /**
   * Check if user has access to a specific course
   * Admin users bypass enrollment check
   */
  hasAccess: (userId: string | undefined, courseId: string): boolean => {
    if (!userId) return false

    // Admin bypass check
    const userStr = localStorage.getItem('eyebuckz_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'ADMIN') {
          console.log('[Enrollment] Admin bypass for user:', userId)
          return true
        }
      } catch (error) {
        console.error('[Enrollment] Error parsing user data:', error)
      }
    }

    // Check enrollment
    const enrollments = enrollmentService.getUserEnrollments(userId)
    const hasAccess = enrollments.some(e => e.courseId === courseId)

    console.log('[Enrollment] Access check:', { userId, courseId, hasAccess })
    return hasAccess
  },

  /**
   * Get a specific enrollment
   */
  getEnrollment: (userId: string, courseId: string): Enrollment | null => {
    const enrollments = enrollmentService.getUserEnrollments(userId)
    return enrollments.find(e => e.courseId === courseId) || null
  },

  /**
   * Update last accessed time for a course
   */
  updateLastAccess: (userId: string, courseId: string): void => {
    const enrollments = enrollmentService.getAll()
    const updated = enrollments.map(e => {
      if (e.userId === userId && e.courseId === courseId) {
        return { ...e, lastAccessedAt: new Date().toISOString() }
      }
      return e
    })
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(updated))
    console.log('[Enrollment] Updated last access for user:', userId, 'course:', courseId)
  },

  /**
   * Update progress for an enrollment
   */
  updateProgress: (
    userId: string,
    courseId: string,
    data: Partial<Enrollment['progress']>
  ): void => {
    const enrollments = enrollmentService.getAll()
    const updated = enrollments.map(e => {
      if (e.userId === userId && e.courseId === courseId) {
        return {
          ...e,
          progress: { ...e.progress, ...data }
        }
      }
      return e
    })
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(updated))
    console.log('[Enrollment] Updated progress for user:', userId, 'course:', courseId, data)
  },

  /**
   * Check if user already owns a course
   */
  isAlreadyOwned: (userId: string, courseId: string): boolean => {
    return enrollmentService.hasAccess(userId, courseId)
  },

  /**
   * Get enrollment statistics for a user
   */
  getUserStats: (userId: string): {
    totalEnrollments: number
    totalCompleted: number
    totalInProgress: number
    totalWatchTime: number
  } => {
    const enrollments = enrollmentService.getUserEnrollments(userId)

    const stats = {
      totalEnrollments: enrollments.length,
      totalCompleted: enrollments.filter(e => e.progress.overallPercent === 100).length,
      totalInProgress: enrollments.filter(e => e.progress.overallPercent > 0 && e.progress.overallPercent < 100).length,
      totalWatchTime: enrollments.reduce((sum, e) => sum + e.progress.totalWatchTime, 0)
    }

    return stats
  },

  /**
   * Revoke enrollment (for admin)
   */
  revokeEnrollment: (enrollmentId: string): boolean => {
    const enrollments = enrollmentService.getAll()
    const updated = enrollments.map(e => {
      if (e.id === enrollmentId) {
        return { ...e, status: 'REVOKED' as const }
      }
      return e
    })
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(updated))
    console.log('[Enrollment] Revoked enrollment:', enrollmentId)
    return true
  },

  /**
   * Clear all enrollments (for testing/development)
   */
  clearAll: (): void => {
    localStorage.removeItem(ENROLLMENTS_KEY)
    console.log('[Enrollment] Cleared all enrollments')
  }
}
