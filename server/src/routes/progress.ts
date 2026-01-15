import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

const COMPLETION_THRESHOLD = 0.95; // 95% to mark as complete

/**
 * POST /api/progress
 * Save progress checkpoint for a module
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userId,
      courseId,
      moduleId,
      timestamp
    } = req.body;

    // Validate required fields
    if (!userId || !courseId || !moduleId || timestamp === undefined) {
      throw new AppError('Missing required fields', 400);
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      throw new AppError('No active enrollment found', 403);
    }

    // Check if module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      throw new AppError('Module not found', 404);
    }

    // Find or create progress
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_courseId_moduleId: {
          userId,
          courseId,
          moduleId
        }
      }
    });

    let progress;

    if (existingProgress) {
      // Update existing progress
      progress = await prisma.progress.update({
        where: {
          userId_courseId_moduleId: {
            userId,
            courseId,
            moduleId
          }
        },
        data: {
          timestamp: timestamp,
          watchTime: existingProgress.watchTime + 30, // Add 30 seconds
          viewCount: existingProgress.viewCount
        }
      });
    } else {
      // Create new progress
      progress = await prisma.progress.create({
        data: {
          userId,
          courseId,
          moduleId,
          timestamp,
          watchTime: 30, // Initial 30 seconds
          viewCount: 1,
          completed: false
        }
      });
    }

    res.json({
      success: true,
      progress: {
        moduleId: progress.moduleId,
        timestamp: progress.timestamp,
        completed: progress.completed,
        watchTime: progress.watchTime
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/:userId/:courseId
 * Get all progress for a user's course
 */
router.get('/:userId/:courseId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Check authorization
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    const progressRecords = await prisma.progress.findMany({
      where: {
        userId,
        courseId
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            duration: true,
            durationSeconds: true
          }
        }
      }
    });

    const progress = progressRecords.map(p => ({
      moduleId: p.moduleId,
      moduleTitle: p.module.title,
      timestamp: p.timestamp,
      completed: p.completed,
      completedAt: p.completedAt,
      watchTime: p.watchTime,
      viewCount: p.viewCount,
      lastUpdatedAt: p.lastUpdatedAt
    }));

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/:userId/:courseId/:moduleId
 * Get progress for a specific module
 */
router.get('/:userId/:courseId/:moduleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId, moduleId } = req.params;

    // Check authorization
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    const progress = await prisma.progress.findUnique({
      where: {
        userId_courseId_moduleId: {
          userId,
          courseId,
          moduleId
        }
      }
    });

    res.json({
      success: true,
      progress: progress ? {
        moduleId: progress.moduleId,
        timestamp: progress.timestamp,
        completed: progress.completed,
        completedAt: progress.completedAt,
        watchTime: progress.watchTime,
        viewCount: progress.viewCount
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/progress/complete
 * Mark a module as completed
 */
router.patch('/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userId,
      courseId,
      moduleId,
      currentTime,
      duration
    } = req.body;

    if (!userId || !courseId || !moduleId) {
      throw new AppError('Missing required fields', 400);
    }

    // Check if already completed
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_courseId_moduleId: {
          userId,
          courseId,
          moduleId
        }
      }
    });

    if (existingProgress?.completed) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        progress: existingProgress
      });
    }

    // Validate completion threshold if duration provided
    if (currentTime !== undefined && duration !== undefined) {
      const watchPercent = currentTime / duration;
      if (watchPercent < COMPLETION_THRESHOLD) {
        throw new AppError('Module not completed yet (needs 95% watch time)', 400);
      }
    }

    // Mark as completed
    const progress = await prisma.progress.upsert({
      where: {
        userId_courseId_moduleId: {
          userId,
          courseId,
          moduleId
        }
      },
      update: {
        completed: true,
        completedAt: new Date()
      },
      create: {
        userId,
        courseId,
        moduleId,
        completed: true,
        completedAt: new Date(),
        timestamp: 0,
        watchTime: 0,
        viewCount: 1
      }
    });

    // Update enrollment progress
    const allProgress = await prisma.progress.findMany({
      where: { userId, courseId }
    });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: { select: { id: true } }
      }
    });

    if (course) {
      const completedCount = allProgress.filter(p => p.completed).length;
      const totalModules = course.modules.length;
      const overallPercent = Math.round((completedCount / totalModules) * 100);

      await prisma.enrollment.updateMany({
        where: {
          userId,
          courseId
        },
        data: {
          completedModules: allProgress.filter(p => p.completed).map(p => p.moduleId),
          currentModule: moduleId,
          overallPercent
        }
      });

      res.json({
        success: true,
        progress,
        stats: {
          completedCount,
          totalModules,
          overallPercent
        }
      });
    } else {
      res.json({
        success: true,
        progress
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/:userId/:courseId/stats
 * Get overall progress stats for a course
 */
router.get('/:userId/:courseId/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Check authorization
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    const [progressRecords, course] = await Promise.all([
      prisma.progress.findMany({
        where: { userId, courseId }
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: { select: { id: true } }
        }
      })
    ]);

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const completedCount = progressRecords.filter(p => p.completed).length;
    const totalModules = course.modules.length;
    const overallPercent = totalModules > 0
      ? Math.round((completedCount / totalModules) * 100)
      : 0;
    const totalWatchTime = progressRecords.reduce((sum, p) => sum + p.watchTime, 0);

    res.json({
      success: true,
      stats: {
        completedCount,
        totalModules,
        overallPercent,
        totalWatchTime,
        modules: progressRecords.map(p => ({
          moduleId: p.moduleId,
          completed: p.completed,
          watchTime: p.watchTime
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/progress/:userId/:courseId
 * Clear all progress for a course (for testing)
 */
router.delete('/:userId/:courseId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Only allow users to delete their own progress, or admins
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    await prisma.progress.deleteMany({
      where: {
        userId,
        courseId
      }
    });

    // Reset enrollment progress
    await prisma.enrollment.updateMany({
      where: {
        userId,
        courseId
      },
      data: {
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      }
    });

    res.json({
      success: true,
      message: 'Progress cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
