import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import db from '../config/database';
import { AuthenticatedRequest, User } from '../types';
import { ERROR_MESSAGES } from '../utils/constants';

interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  branchId?: number;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log('=== AUTH DEBUG ===');
    console.log('Path:', req.path);
    console.log('Auth Header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth failed: No Bearer token');
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      });
      return;
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      console.log('Token decoded successfully, userId:', decoded.userId);
    } catch (error) {
      console.log('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      });
      return;
    }

    // Get user from database
    const result = await db.query<User>(
      `SELECT id, name, email, username, role, status, branch_id, avatar, last_login
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('User not found in database, userId:', decoded.userId);
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.USER_NOT_FOUND,
      });
      return;
    }

    const user = result.rows[0];
    console.log('User found:', user.username, 'status:', user.status);

    // Check if user is active
    if (user.status !== 'active') {
      console.log('User inactive:', user.username);
      res.status(403).json({
        success: false,
        error: ERROR_MESSAGES.USER_INACTIVE,
      });
      return;
    }

    // Attach user to request
    req.user = user;
    console.log('Auth successful for:', user.username);
    console.log('==================');
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      const result = await db.query<User>(
        `SELECT id, name, email, username, role, status, branch_id, avatar
         FROM users WHERE id = $1 AND status = 'active'`,
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch {
      // Token invalid or expired, continue without user
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (user: User): string => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branch_id,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
  );
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: number } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: number; type: string };
    if (decoded.type !== 'refresh') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
};

export default {
  authenticate,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
};
