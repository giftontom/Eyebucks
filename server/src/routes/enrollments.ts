import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * POST /api/enrollments
 * Create a new enrollment (after payment)
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userId,
      courseId,
      paymentId,
      orderId,
      amount
    } = req.body;

    // Validate required fields
    if (!userId || !courseId || !amount) {
      throw new AppError('Missing required fields: userId, courseId, amount', 400);
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Check if user already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existing) {
      throw new AppError('User already enrolled in this course', 409);
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE',
        amount,
        paymentId,
        orderId,
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      },
      include: {
        course: {
          select: {
            title: true,
            thumbnail: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      enrollment: {
        id: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
        progress: {
          completedModules: enrollment.completedModules,
          currentModule: enrollment.currentModule,
          overallPercent: enrollment.overallPercent,
          totalWatchTime: enrollment.totalWatchTime
        },
        course: enrollment.course
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/enrollments/user/:userId
 * Get all enrollments for a user
 */
router.get('/user/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Check authorization (user can only see their own enrollments, unless admin)
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            type: true,
            modules: {
              select: {
                id: true,
                title: true
              },
              orderBy: {
                orderIndex: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    const response = enrollments.map(enrollment => ({
      id: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      progress: {
        completedModules: enrollment.completedModules,
        currentModule: enrollment.currentModule,
        overallPercent: enrollment.overallPercent,
        totalWatchTime: enrollment.totalWatchTime
      },
      course: {
        ...enrollment.course,
        totalModules: enrollment.course.modules.length
      }
    }));

    res.json({
      success: true,
      enrollments: response
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/enrollments/check/:userId/:courseId
 * Check if user has access to a course
 */
router.get('/check/:userId/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Check for admin bypass
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role === 'ADMIN') {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'admin_bypass'
      });
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      hasAccess: !!enrollment,
      enrollment: enrollment ? {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        lastAccessedAt: enrollment.lastAccessedAt
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/enrollments/:id/access
 * Update last accessed time for an enrollment
 */
router.patch('/:id/access', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        lastAccessedAt: new Date()
      },
      select: {
        id: true,
        lastAccessedAt: true
      }
    });

    res.json({
      success: true,
      enrollment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/enrollments/:id/progress
 * Update enrollment progress (called by progress service)
 */
router.patch('/:id/progress', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      completedModules,
      currentModule,
      overallPercent,
      totalWatchTime
    } = req.body;

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        completedModules: completedModules || undefined,
        currentModule: currentModule !== undefined ? currentModule : undefined,
        overallPercent: overallPercent !== undefined ? overallPercent : undefined,
        totalWatchTime: totalWatchTime !== undefined ? totalWatchTime : undefined
      },
      select: {
        id: true,
        completedModules: true,
        currentModule: true,
        overallPercent: true,
        totalWatchTime: true
      }
    });

    res.json({
      success: true,
      enrollment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/enrollments
 * Get all enrollments (admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/enrollments/:id
 * Revoke enrollment (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.enrollment.update({
      where: { id },
      data: {
        status: 'REVOKED'
      }
    });

    res.json({
      success: true,
      message: 'Enrollment revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
