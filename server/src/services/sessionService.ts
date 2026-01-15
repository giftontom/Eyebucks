import { prisma } from '../utils/db';

// Maximum concurrent sessions per user
const MAX_SESSIONS_PER_USER = 3;

/**
 * Session Service
 * Manages user sessions in the database
 */
export const sessionService = {
  /**
   * Create a new session
   * Enforces max concurrent sessions limit
   */
  async createSession(
    userId: string,
    accessToken: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
      expiresAt: Date;
    }
  ) {
    try {
      // Count existing active sessions for this user
      const activeSessions = await prisma.session.count({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      // If user has too many sessions, deactivate the oldest one
      if (activeSessions >= MAX_SESSIONS_PER_USER) {
        const oldestSession = await prisma.session.findFirst({
          where: {
            userId,
            isActive: true
          },
          orderBy: {
            lastActivity: 'asc'
          }
        });

        if (oldestSession) {
          await prisma.session.update({
            where: { id: oldestSession.id },
            data: { isActive: false }
          });
          console.log(`[Session] Deactivated oldest session for user ${userId} due to limit`);
        }
      }

      // Create new session
      const session = await prisma.session.create({
        data: {
          userId,
          accessToken,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          deviceInfo: options.deviceInfo,
          expiresAt: options.expiresAt,
          isActive: true
        }
      });

      console.log(`[Session] Created session ${session.id} for user ${userId}`);
      return session;
    } catch (error) {
      console.error('[Session] Error creating session:', error);
      throw error;
    }
  },

  /**
   * Validate session by access token
   * Returns session if valid and active
   */
  async validateSession(accessToken: string) {
    try {
      const session = await prisma.session.findUnique({
        where: { accessToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              phoneVerified: true,
              emailVerified: true
            }
          }
        }
      });

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.invalidateSession(session.id);
        return null;
      }

      // Check if session is inactive
      if (!session.isActive) {
        return null;
      }

      // Check if user is active
      if (!session.user.isActive) {
        return null;
      }

      // Update last activity timestamp
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });

      return session;
    } catch (error) {
      console.error('[Session] Error validating session:', error);
      return null;
    }
  },

  /**
   * Invalidate a specific session by ID
   */
  async invalidateSession(sessionId: string) {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      console.log(`[Session] Invalidated session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[Session] Error invalidating session:', error);
      return false;
    }
  },

  /**
   * Invalidate session by access token
   */
  async invalidateSessionByToken(accessToken: string) {
    try {
      const session = await prisma.session.findUnique({
        where: { accessToken }
      });

      if (session) {
        await this.invalidateSession(session.id);
      }

      return true;
    } catch (error) {
      console.error('[Session] Error invalidating session by token:', error);
      return false;
    }
  },

  /**
   * Invalidate all sessions for a user (force logout from all devices)
   */
  async invalidateAllUserSessions(userId: string) {
    try {
      const result = await prisma.session.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      console.log(`[Session] Invalidated ${result.count} sessions for user ${userId}`);
      return result.count;
    } catch (error) {
      console.error('[Session] Error invalidating all user sessions:', error);
      return 0;
    }
  },

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string) {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastActivity: 'desc'
        },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          deviceInfo: true,
          lastActivity: true,
          createdAt: true,
          expiresAt: true
        }
      });

      return sessions;
    } catch (error) {
      console.error('[Session] Error getting user sessions:', error);
      return [];
    }
  },

  /**
   * Clean up expired sessions
   * Should be run periodically (e.g., via cron job)
   */
  async cleanExpiredSessions() {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      console.log(`[Session] Cleaned up ${result.count} expired sessions`);
      return result.count;
    } catch (error) {
      console.error('[Session] Error cleaning expired sessions:', error);
      return 0;
    }
  },

  /**
   * Create refresh token record
   */
  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    try {
      const refreshToken = await prisma.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt
        }
      });

      console.log(`[Session] Created refresh token for user ${userId}`);
      return refreshToken;
    } catch (error) {
      console.error('[Session] Error creating refresh token:', error);
      throw error;
    }
  },

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string) {
    try {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true
            }
          }
        }
      });

      if (!refreshToken) {
        return null;
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        return null;
      }

      // Check if token is revoked
      if (refreshToken.isRevoked) {
        return null;
      }

      // Check if user is active
      if (!refreshToken.user.isActive) {
        return null;
      }

      return refreshToken;
    } catch (error) {
      console.error('[Session] Error validating refresh token:', error);
      return null;
    }
  },

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string) {
    try {
      await prisma.refreshToken.update({
        where: { token },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      });

      console.log(`[Session] Revoked refresh token`);
      return true;
    } catch (error) {
      console.error('[Session] Error revoking refresh token:', error);
      return false;
    }
  },

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string) {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      });

      console.log(`[Session] Revoked ${result.count} refresh tokens for user ${userId}`);
      return result.count;
    } catch (error) {
      console.error('[Session] Error revoking all user refresh tokens:', error);
      return 0;
    }
  }
};
