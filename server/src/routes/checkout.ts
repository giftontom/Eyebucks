import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Initialize Razorpay (will be loaded from env)
let Razorpay: any;
let razorpayInstance: any;

// Lazy load Razorpay SDK
const initRazorpay = async () => {
  if (!Razorpay) {
    try {
      Razorpay = (await import('razorpay')).default;
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!
      });
    } catch (error) {
      console.error('[Razorpay] SDK not installed or env vars missing');
      throw new AppError('Payment gateway not configured', 500);
    }
  }
  return razorpayInstance;
};

/**
 * POST /api/checkout/create-order
 * Create a Razorpay order
 */
router.post('/create-order', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, userId } = req.body;

    if (!courseId || !userId) {
      throw new AppError('Missing required fields: courseId, userId', 400);
    }

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        price: true,
        status: true
      }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.status !== 'PUBLISHED') {
      throw new AppError('Course is not available for purchase', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE'
      }
    });

    if (existingEnrollment) {
      throw new AppError('User already enrolled in this course', 409);
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      // Mock mode for development
      console.log('[Checkout] Razorpay not configured, using mock mode');

      const mockOrderId = `order_mock_${Date.now()}`;

      return res.json({
        success: true,
        mock: true,
        orderId: mockOrderId,
        amount: course.price,
        currency: 'INR',
        key: 'mock_key',
        courseTitle: course.title,
        message: 'Mock payment mode (Razorpay not configured)'
      });
    }

    // Create Razorpay order
    const razorpay = await initRazorpay();

    const options = {
      amount: course.price, // amount in paise
      currency: 'INR',
      receipt: `receipt_${courseId}_${userId}_${Date.now()}`,
      notes: {
        courseId,
        userId,
        courseTitle: course.title
      }
    };

    const order = await razorpay.orders.create(options);

    console.log('[Checkout] Order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      courseTitle: course.title
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/checkout/verify
 * Verify Razorpay payment signature
 */
router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      courseId,
      userId
    } = req.body;

    if (!orderId || !paymentId || !courseId || !userId) {
      throw new AppError('Missing required fields', 400);
    }

    // Check if mock mode
    if (orderId.startsWith('order_mock_')) {
      console.log('[Checkout] Mock payment verification');

      // Create enrollment immediately
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        throw new AppError('Course not found', 404);
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE',
          amount: course.price,
          paymentId: paymentId || `pay_mock_${Date.now()}`,
          orderId: orderId,
          completedModules: [],
          currentModule: null,
          overallPercent: 0,
          totalWatchTime: 0
        }
      });

      return res.json({
        success: true,
        mock: true,
        verified: true,
        enrollmentId: enrollment.id,
        message: 'Mock payment verified'
      });
    }

    // Real Razorpay verification
    if (!signature) {
      throw new AppError('Payment signature missing', 400);
    }

    // Generate expected signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new AppError('Invalid payment signature', 400);
    }

    console.log('[Checkout] Payment verified:', paymentId);

    // Get course
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE',
        amount: course.price,
        paymentId,
        orderId,
        completedModules: [],
        currentModule: null,
        overallPercent: 0,
        totalWatchTime: 0
      }
    });

    console.log('[Checkout] Enrollment created:', enrollment.id);

    res.json({
      success: true,
      verified: true,
      enrollmentId: enrollment.id
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/checkout/webhook
 * Handle Razorpay webhook events
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.log('[Webhook] Webhook secret not configured, skipping verification');
      return res.json({ success: true, message: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      throw new AppError('Webhook signature missing', 400);
    }

    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    // Process webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    console.log('[Webhook] Received event:', event);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      default:
        console.log('[Webhook] Unhandled event:', event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    next(error);
  }
});

/**
 * Handle payment.captured webhook
 */
async function handlePaymentCaptured(payload: any) {
  const payment = payload.payment.entity;
  const orderId = payment.order_id;
  const paymentId = payment.id;
  const amount = payment.amount;

  console.log('[Webhook] Payment captured:', paymentId);

  // Get order notes (contains courseId and userId)
  const razorpay = await initRazorpay();
  const order = await razorpay.orders.fetch(orderId);

  const { courseId, userId } = order.notes;

  if (!courseId || !userId) {
    console.error('[Webhook] Missing courseId or userId in order notes');
    return;
  }

  // Check if enrollment already exists
  const existing = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      paymentId
    }
  });

  if (existing) {
    console.log('[Webhook] Enrollment already exists:', existing.id);
    return;
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'ACTIVE',
      amount: amount,
      paymentId,
      orderId,
      completedModules: [],
      currentModule: null,
      overallPercent: 0,
      totalWatchTime: 0
    }
  });

  console.log('[Webhook] Enrollment created via webhook:', enrollment.id);

  // TODO: Send enrollment confirmation email
}

/**
 * Handle payment.failed webhook
 */
async function handlePaymentFailed(payload: any) {
  const payment = payload.payment.entity;
  console.log('[Webhook] Payment failed:', payment.id);

  // TODO: Send payment failure notification
  // TODO: Log failed payment for analytics
}

/**
 * GET /api/checkout/status/:orderId
 * Check order status (for polling)
 */
router.get('/status/:orderId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    // Check if enrollment exists for this order
    const enrollment = await prisma.enrollment.findFirst({
      where: { orderId },
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (enrollment) {
      return res.json({
        success: true,
        status: 'completed',
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          enrolledAt: enrollment.enrolledAt
        }
      });
    }

    // Order not yet processed
    res.json({
      success: true,
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
