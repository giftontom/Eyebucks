import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/courses
 * List all published courses
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        status: 'PUBLISHED'
      },
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            duration: true,
            durationSeconds: true,
            isFreePreview: true,
            orderIndex: true
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to match frontend format
    const transformedCourses = courses.map(course => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      price: course.price,
      thumbnail: course.thumbnail,
      heroVideoId: course.heroVideoId,
      type: course.type,
      status: course.status,
      features: course.features,
      rating: course.rating,
      totalStudents: course._count.enrollments,
      chapters: course.modules.map(mod => ({
        id: mod.id,
        title: mod.title,
        duration: mod.duration,
        durationSeconds: mod.durationSeconds,
        isFreePreview: mod.isFreePreview,
        isCompleted: false, // Will be set by frontend
        videoUrl: '' // Don't send video URL until access is verified
      }))
    }));

    res.json({
      success: true,
      courses: transformedCourses
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id
 * Get single course details
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            duration: true,
            durationSeconds: true,
            isFreePreview: true,
            videoUrl: true,
            orderIndex: true
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true
              }
            }
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Check if user has access
    const hasAccess = req.user
      ? await prisma.enrollment.findFirst({
          where: {
            userId: req.user.id,
            courseId: id,
            status: 'ACTIVE'
          }
        })
      : null;

    // Transform response
    const response = {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      price: course.price,
      thumbnail: course.thumbnail,
      heroVideoId: course.heroVideoId,
      type: course.type,
      status: course.status,
      features: course.features,
      rating: course.rating,
      totalStudents: course._count.enrollments,
      chapters: course.modules.map(mod => ({
        id: mod.id,
        title: mod.title,
        duration: mod.duration,
        durationSeconds: mod.durationSeconds,
        isFreePreview: mod.isFreePreview,
        videoUrl: hasAccess || mod.isFreePreview ? mod.videoUrl : '', // Only send URL if user has access
        isCompleted: false
      })),
      reviews: course.reviews.map(rev => ({
        id: rev.id,
        user: rev.user.name,
        rating: rev.rating,
        comment: rev.comment,
        date: rev.createdAt.toISOString()
      })),
      hasAccess: !!hasAccess
    };

    res.json({
      success: true,
      course: response
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id/modules
 * Get all modules for a course
 */
router.get('/:id/modules', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        modules: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Check if user has access
    const hasAccess = req.user
      ? await prisma.enrollment.findFirst({
          where: {
            userId: req.user.id,
            courseId: id,
            status: 'ACTIVE'
          }
        })
      : null;

    const modules = course.modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      duration: mod.duration,
      durationSeconds: mod.durationSeconds,
      videoUrl: hasAccess || mod.isFreePreview ? mod.videoUrl : '',
      isFreePreview: mod.isFreePreview,
      orderIndex: mod.orderIndex
    }));

    res.json({
      success: true,
      modules,
      hasAccess: !!hasAccess
    });
  } catch (error) {
    next(error);
  }
});

export default router;
