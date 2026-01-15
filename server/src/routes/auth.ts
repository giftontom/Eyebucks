import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { sessionService } from '../services/sessionService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.socket.remoteAddress ||
         'unknown';
}

// Helper function to record login attempt
async function recordLoginAttempt(
  email: string,
  success: boolean,
  req: Request,
  userId?: string,
  failReason?: string
) {
  try {
    await prisma.loginAttempt.create({
      data: {
        userId,
        email,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        success,
        failReason
      }
    });
  } catch (error) {
    console.error('[Auth] Error recording login attempt:', error);
  }
}

/**
 * POST /api/auth/google
 * Authenticate with Google OAuth
 * Exchanges Google credential for JWT tokens and creates session
 */
router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, email, name, picture, sub } = req.body;

    let verifiedEmail: string;
    let verifiedName: string;
    let verifiedPicture: string | undefined;
    let verifiedSub: string;

    // If GOOGLE_CLIENT_ID is configured, verify the credential with Google
    if (process.env.GOOGLE_CLIENT_ID && credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error('Invalid Google token payload');
        }

        verifiedEmail = payload.email!;
        verifiedName = payload.name!;
        verifiedPicture = payload.picture;
        verifiedSub = payload.sub;

        console.log('[Auth] Google token verified for:', verifiedEmail);
      } catch (error) {
        await recordLoginAttempt(email || 'unknown', false, req, undefined, 'Invalid Google token');
        throw new AppError('Invalid Google authentication token', 401);
      }
    } else {
      // Development mode: Use provided credentials without verification
      if (!email || !name || !sub) {
        throw new AppError('Missing required fields: email, name, sub', 400);
      }
      verifiedEmail = email;
      verifiedName = name;
      verifiedPicture = picture;
      verifiedSub = sub;
      console.log('[Auth] Dev mode: Using unverified credentials for:', email);
    }

    // Check if account is locked
    const recentFailedAttempts = await prisma.loginAttempt.count({
      where: {
        email: verifiedEmail,
        success: false,
        attemptAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentFailedAttempts >= 5) {
      await recordLoginAttempt(verifiedEmail, false, req, undefined, 'Account temporarily locked');
      throw new AppError('Too many failed login attempts. Please try again later.', 429);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail }
    });

    const isNewUser = !user;

    if (user) {
      // Check if user is active
      if (!user.isActive) {
        await recordLoginAttempt(verifiedEmail, false, req, user.id, 'Account disabled');
        throw new AppError('Your account has been disabled. Please contact support.', 403);
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await recordLoginAttempt(verifiedEmail, false, req, user.id, 'Account locked');
        throw new AppError('Account is temporarily locked. Please try again later.', 403);
      }

      // Update existing user
      user = await prisma.user.update({
        where: { email: verifiedEmail },
        data: {
          name: verifiedName,
          avatar: verifiedPicture || user.avatar,
          googleId: verifiedSub,
          emailVerified: true, // Google accounts are email-verified
          failedLoginAttempts: 0, // Reset failed attempts on successful login
          lastLoginAt: new Date()
        }
      });

      console.log('[Auth] Existing user logged in:', user.id);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: verifiedEmail,
          name: verifiedName,
          avatar: verifiedPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${verifiedEmail}`,
          googleId: verifiedSub,
          role: 'USER',
          emailVerified: true, // Google accounts are email-verified
          lastLoginAt: new Date()
        }
      });

      console.log('[Auth] New user created:', user.id);
    }

    // Check if user should be admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (adminEmails.includes(verifiedEmail) && user.role !== 'ADMIN') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      console.log('[Auth] User promoted to admin:', user.id);
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user.id, user.email, user.role);

    // Create session in database
    await sessionService.createSession(user.id, tokens.accessToken, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      deviceInfo: req.headers['user-agent'],
      expiresAt: tokens.accessTokenExpires
    });

    // Create refresh token in database
    await sessionService.createRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpires
    );

    // Record successful login
    await recordLoginAttempt(verifiedEmail, true, req, user.id);

    // Set tokens in HTTP-only cookies (secure in production)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data and tokens
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone_e164: user.phoneE164,
        role: user.role,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        google_id: user.googleId
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      },
      isNewUser
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/phone
 * Update user phone number (for gap check)
 */
router.post('/phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      throw new AppError('Missing required fields: userId, phone', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { phoneE164: phone }
    });

    console.log('[Auth] Phone updated for user:', user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone_e164: user.phoneE164,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    // Verify refresh token JWT
    const decoded = verifyRefreshToken(refreshToken);

    // Validate refresh token in database
    const tokenRecord = await sessionService.validateRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Generate new access token (refresh token stays the same)
    const tokens = generateTokenPair(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role
    );

    // Create new session for the new access token
    await sessionService.createSession(tokenRecord.user.id, tokens.accessToken, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      deviceInfo: req.headers['user-agent'],
      expiresAt: tokens.accessTokenExpires
    });

    // Set new access token in cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: 900
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phoneE164: true,
        role: true,
        phoneVerified: true,
        emailVerified: true,
        googleId: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone_e164: user.phoneE164,
        role: user.role,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        google_id: user.googleId,
        created_at: user.createdAt,
        last_login_at: user.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate current session and tokens)
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const token = req.cookies?.accessToken || req.headers.authorization?.substring(7);
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    // Invalidate session
    if (token) {
      await sessionService.invalidateSessionByToken(token);
    }

    // Revoke refresh token
    if (refreshToken) {
      await sessionService.revokeRefreshToken(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    console.log('[Auth] User logged out:', req.user.id);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices (invalidate all sessions)
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Invalidate all sessions
    const sessionsInvalidated = await sessionService.invalidateAllUserSessions(req.user.id);

    // Revoke all refresh tokens
    const tokensRevoked = await sessionService.revokeAllUserRefreshTokens(req.user.id);

    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    console.log(`[Auth] User logged out from all devices: ${req.user.id} (${sessionsInvalidated} sessions, ${tokensRevoked} tokens)`);

    res.json({
      success: true,
      message: `Logged out from ${sessionsInvalidated} devices`,
      sessionsInvalidated,
      tokensRevoked
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const sessions = await sessionService.getUserSessions(req.user.id);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        deviceInfo: s.deviceInfo,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.id === req.session?.id
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { sessionId } = req.params;

    // Verify session belongs to current user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.userId !== req.user.id) {
      throw new AppError('Unauthorized to revoke this session', 403);
    }

    await sessionService.invalidateSession(sessionId);

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/user/:userId
 * Get user profile
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phoneE164: true,
        role: true,
        googleId: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone_e164: user.phoneE164,
        role: user.role,
        google_id: user.googleId,
        created_at: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
