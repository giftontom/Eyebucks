import jwt from 'jsonwebtoken';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'eyebuckz-dev-jwt-secret-key-12345678901234567890';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Token payload interfaces
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

export interface DecodedToken {
  userId: string;
  email?: string;
  role?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token (short-lived)
 * Used for API authentication
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role: string
): string {
  const payload: AccessTokenPayload = {
    userId,
    email,
    role,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'eyebuckz-lms',
    audience: 'eyebuckz-api'
  });
}

/**
 * Generate JWT refresh token (long-lived)
 * Used to obtain new access tokens
 */
export function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = {
    userId,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'eyebuckz-lms',
    audience: 'eyebuckz-api'
  });
}

/**
 * Verify and decode access token
 * Throws error if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'eyebuckz-lms',
      audience: 'eyebuckz-api'
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode refresh token
 * Throws error if token is invalid or expired
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'eyebuckz-lms',
      audience: 'eyebuckz-api'
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification
 * Useful for extracting user info from expired tokens
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
}

/**
 * Generate both access and refresh tokens
 * Returns object with both tokens
 */
export function generateTokenPair(userId: string, email: string, role: string): {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  refreshTokenExpires: Date;
} {
  const accessToken = generateAccessToken(userId, email, role);
  const refreshToken = generateRefreshToken(userId);

  // Calculate expiration dates
  const now = new Date();
  const accessTokenExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    accessToken,
    refreshToken,
    accessTokenExpires,
    refreshTokenExpires
  };
}
