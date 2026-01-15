import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken } from '../utils/jwt';
import { sessionService } from '../services/sessionService';
import { prisma } from '../utils/db';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        phoneVerified: boolean;
        emailVerified: boolean;
      };
      session?: {
        id: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Extract JWT token from Authorization header or cookies
 */
function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (if cookie-parser is used)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Authentication middleware (JWT-based)
 * Validates JWT token and loads user from database
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify JWT token
    const decoded = verifyAccessToken(token);

    // Validate session in database
    const session = await sessionService.validateSession(token);

    if (!session) {
      throw new AppError('Invalid or expired session', 401);
    }

    // Check if user account is active
    if (!session.user.isActive) {
      throw new AppError('Account is disabled', 403);
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      phoneVerified: session.user.phoneVerified,
      emailVerified: session.user.emailVerified
    };

    req.session = {
      id: session.id,
      expiresAt: session.expiresAt
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        next(new AppError('Session expired. Please login again.', 401));
      } else if (error.message.includes('Invalid')) {
        next(new AppError('Invalid authentication token', 401));
      } else {
        next(error);
      }
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

/**
 * Admin authorization middleware
 * Must be used after authenticate middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }

  next();
};

/**
 * Phone verification middleware
 * Ensures user has verified their phone number
 */
export const requirePhoneVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (!req.user.phoneVerified) {
    throw new AppError('Phone verification required', 403);
  }

  next();
};

/**
 * Optional authentication middleware
 * Doesn't fail if no auth provided, but validates if present
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Verify JWT token
    const decoded = verifyAccessToken(token);

    // Validate session in database
    const session = await sessionService.validateSession(token);

    if (session && session.user.isActive) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        phoneVerified: session.user.phoneVerified,
        emailVerified: session.user.emailVerified
      };

      req.session = {
        id: session.id,
        expiresAt: session.expiresAt
      };
    }

    next();
  } catch (error) {
    // Silently fail - this is optional auth
    next();
  }
};
