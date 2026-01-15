import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { certificateService } from '../services/certificateService';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// ============================================
// DASHBOARD ANALYTICS
// ============================================

/**
 * GET /api/admin/stats
 * Get overall platform statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get active users (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get total revenue (sum of all completed enrollments)
    const revenueData = await prisma.enrollment.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'ACTIVE'
      }
    });

    const totalRevenue = revenueData._sum.amount || 0;

    // Get total courses count
    const totalCourses = await prisma.course.count({
      where: {
        status: 'PUBLISHED'
      }
    });

    const draftCourses = await prisma.course.count({
      where: {
        status: 'DRAFT'
      }
    });

    // Get total enrollments
    const totalEnrollments = await prisma.enrollment.count({
      where: {
        status: 'ACTIVE'
      }
    });

    // Get total certificates issued
    const totalCertificates = await prisma.certificate.count({
      where: {
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalRevenue: totalRevenue / 100, // Convert from paise to rupees
        totalCourses,
        draftCourses,
        totalEnrollments,
        totalCertificates
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/sales
 * Get sales data for revenue chart
 */
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Get all enrollments grouped by date
    const enrollments = await prisma.enrollment.findMany({
      where: {
        enrolledAt: {
          gte: daysAgo
        },
        status: 'ACTIVE'
      },
      select: {
        enrolledAt: true,
        amount: true
      },
      orderBy: {
        enrolledAt: 'asc'
      }
    });

    // Group by date
    const salesByDate: { [key: string]: number } = {};

    enrollments.forEach(enrollment => {
      const date = enrollment.enrolledAt.toISOString().split('T')[0];
      if (!salesByDate[date]) {
        salesByDate[date] = 0;
      }
      salesByDate[date] += enrollment.amount;
    });

    // Convert to array format
    const salesData = Object.entries(salesByDate).map(([date, amount]) => ({
      date,
      amount: amount / 100 // Convert from paise to rupees
    }));

    res.json({
      success: true,
      sales: salesData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/recent-activity
 * Get recent platform activity
 */
router.get('/recent-activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent enrollments
    const recentEnrollments = await prisma.enrollment.findMany({
      take: Number(limit),
      orderBy: {
        enrolledAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    });

    // Get recent user signups
    const recentUsers = await prisma.user.findMany({
      take: Number(limit),
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      activity: {
        enrollments: recentEnrollments.map(e => ({
          id: e.id,
          type: 'enrollment',
          user: e.user.name,
          userEmail: e.user.email,
          course: e.course.title,
          amount: e.amount / 100,
          timestamp: e.enrolledAt
        })),
        signups: recentUsers.map(u => ({
          id: u.id,
          type: 'signup',
          user: u.name,
          userEmail: u.email,
          timestamp: u.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * List all users with pagination and search
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      where.role = role;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          phoneE164: true,
          phoneVerified: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users: users.map(u => ({
        ...u,
        enrollmentCount: u._count.enrollments
      })),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: {
              select: {
                title: true,
                thumbnail: true
              }
            }
          },
          orderBy: {
            enrolledAt: 'desc'
          }
        },
        certificates: {
          include: {
            course: {
              select: {
                title: true
              }
            }
          }
        },
        sessions: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            lastActivity: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (activate/deactivate, change role)
 */
router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const updateData: any = {};

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      updateData.role = role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/enroll/:courseId
 * Manually enroll a user in a course
 */
router.post('/users/:userId/enroll/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existing) {
      throw new AppError('User is already enrolled in this course', 400);
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        amount: 0, // Manual enrollment - no payment
        status: 'ACTIVE',
        paymentId: 'manual_' + Date.now(),
        orderId: 'admin_manual_' + Date.now()
      },
      include: {
        course: {
          select: {
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `${user.name} successfully enrolled in ${course.title}`,
      enrollment
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * GET /api/admin/courses
 * Get all courses (including drafts) for admin
 */
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            duration: true,
            orderIndex: true
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      courses: courses.map(c => ({
        ...c,
        enrollmentCount: c._count.enrollments,
        reviewCount: c._count.reviews
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/courses
 * Create a new course
 */
router.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      slug,
      description,
      price,
      thumbnail,
      type,
      features
    } = req.body;

    // Validate required fields
    if (!title || !slug || !description || price === undefined || !type) {
      throw new AppError('Missing required fields', 400);
    }

    // Check if slug already exists
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError('Slug already exists', 400);
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        price: Math.round(price * 100), // Convert to paise
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1485846234645-a62644f84728',
        type,
        features: features || [],
        status: 'DRAFT'
      }
    });

    res.json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/courses/:id
 * Update course details
 */
router.patch('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert price to paise if provided
    if (updateData.price) {
      updateData.price = Math.round(updateData.price * 100);
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/courses/:id
 * Delete a course
 */
router.delete('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if course has any enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId: id }
    });

    if (enrollmentCount > 0) {
      throw new AppError('Cannot delete course with existing enrollments', 400);
    }

    await prisma.course.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/courses/:id/publish
 * Toggle course publish status
 */
router.patch('/courses/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'PUBLISHED' && status !== 'DRAFT') {
      throw new AppError('Invalid status. Must be PUBLISHED or DRAFT', 400);
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null
      }
    });

    res.json({
      success: true,
      message: `Course ${status === 'PUBLISHED' ? 'published' : 'unpublished'} successfully`,
      course
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MODULE MANAGEMENT
// ============================================

/**
 * POST /api/admin/courses/:courseId/modules
 * Create a new module for a course
 */
router.post('/courses/:courseId/modules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title, duration, videoUrl, isFreePreview = false } = req.body;

    if (!title || !duration || !videoUrl) {
      throw new AppError('Missing required fields: title, duration, videoUrl', 400);
    }

    // Verify course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Parse duration (format: "MM:SS") to seconds
    const [minutes, seconds] = duration.split(':').map(Number);
    const durationSeconds = minutes * 60 + seconds;

    // Get the next order index
    const lastModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' }
    });
    const orderIndex = lastModule ? lastModule.orderIndex + 1 : 0;

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        duration,
        durationSeconds,
        videoUrl,
        isFreePreview,
        orderIndex
      }
    });

    res.json({
      success: true,
      message: 'Module created successfully',
      module
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/courses/:courseId/modules/:id
 * Update a module
 */
router.patch('/courses/:courseId/modules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, id } = req.params;
    const { title, duration, videoUrl, isFreePreview } = req.body;

    // Verify module exists and belongs to course
    const existingModule = await prisma.module.findFirst({
      where: { id, courseId }
    });

    if (!existingModule) {
      throw new AppError('Module not found', 404);
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (isFreePreview !== undefined) updateData.isFreePreview = isFreePreview;

    if (duration !== undefined) {
      const [minutes, seconds] = duration.split(':').map(Number);
      updateData.duration = duration;
      updateData.durationSeconds = minutes * 60 + seconds;
    }

    const module = await prisma.module.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Module updated successfully',
      module
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/courses/:courseId/modules/:id
 * Delete a module
 */
router.delete('/courses/:courseId/modules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, id } = req.params;

    // Verify module exists and belongs to course
    const existingModule = await prisma.module.findFirst({
      where: { id, courseId }
    });

    if (!existingModule) {
      throw new AppError('Module not found', 404);
    }

    await prisma.module.delete({
      where: { id }
    });

    // Reorder remaining modules
    const remainingModules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' }
    });

    // Update order indices
    await Promise.all(
      remainingModules.map((mod, index) =>
        prisma.module.update({
          where: { id: mod.id },
          data: { orderIndex: index }
        })
      )
    );

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/courses/:courseId/modules/reorder
 * Reorder modules
 */
router.patch('/courses/:courseId/modules/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds)) {
      throw new AppError('moduleIds must be an array', 400);
    }

    // Verify all modules belong to this course
    const modules = await prisma.module.findMany({
      where: {
        courseId,
        id: { in: moduleIds }
      }
    });

    if (modules.length !== moduleIds.length) {
      throw new AppError('Some modules not found or do not belong to this course', 400);
    }

    // Update order indices
    await Promise.all(
      moduleIds.map((id, index) =>
        prisma.module.update({
          where: { id },
          data: { orderIndex: index }
        })
      )
    );

    res.json({
      success: true,
      message: 'Modules reordered successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CERTIFICATE MANAGEMENT
// ============================================

/**
 * GET /api/admin/certificates
 * List all certificates
 */
router.get('/certificates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        skip,
        take: Number(limit),
        orderBy: {
          issueDate: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          course: {
            select: {
              title: true
            }
          }
        }
      }),
      prisma.certificate.count()
    ]);

    res.json({
      success: true,
      certificates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/certificates
 * Manually issue a certificate
 */
router.post('/certificates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.body;

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Check if certificate already exists
    const existing = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existing) {
      throw new AppError('Certificate already issued to this user for this course', 400);
    }

    // Generate certificate number
    const certificateNumber = `EYEBUCKZ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const issueDate = new Date();
    const completionDate = new Date();

    // Generate PDF certificate
    let pdfPath: string | null = null;
    try {
      pdfPath = await certificateService.generateCertificate({
        studentName: user.name,
        courseTitle: course.title,
        certificateNumber,
        issueDate,
        completionDate
      });
    } catch (pdfError) {
      console.error('[Admin] Failed to generate certificate PDF:', pdfError);
      // Continue even if PDF generation fails
    }

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateNumber,
        studentName: user.name,
        courseTitle: course.title,
        issueDate,
        completionDate,
        status: 'ACTIVE',
        pdfUrl: pdfPath ? certificateService.getCertificateUrl(certificateNumber) : null
      }
    });

    // Send certificate issued email (don't fail if email sending fails)
    try {
      const certificateUrl = certificateService.getCertificateUrl(certificateNumber);

      await emailService.sendCertificateIssued(
        user.email,
        user.name,
        course.title,
        certificateUrl
      );
    } catch (emailError) {
      console.error('[Admin] Failed to send certificate email:', emailError);
    }

    res.json({
      success: true,
      message: 'Certificate issued successfully',
      certificate
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/certificates/:id
 * Revoke a certificate
 */
router.delete('/certificates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const certificate = await prisma.certificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason || 'Revoked by admin'
      }
    });

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      certificate
    });
  } catch (error) {
    next(error);
  }
});

export default router;
