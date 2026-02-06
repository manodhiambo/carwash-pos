import { Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { AuthenticatedRequest, User } from '../types';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logLogin, logLogout, getClientIp } from '../middleware/activityLogger';
import { config } from '../config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * User login
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;

  // Find user by username or email
  const result = await db.query<User>(
    `SELECT * FROM users WHERE (username = $1 OR email = $1) AND status != 'inactive'`,
    [username]
  );

  if (result.rows.length === 0) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
    return;
  }

  const user = result.rows[0];

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
    return;
  }

  // Check if user is suspended
  if (user.status === 'suspended') {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.USER_INACTIVE,
    });
    return;
  }

  // Update last login
  await db.query(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [user.id]
  );

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Log login activity
  await logLogin(user.id, getClientIp(req), req.headers['user-agent']);

  // Remove sensitive data
  const { password_hash, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: {
      user: userWithoutPassword,
      token,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    },
  });
});

/**
 * User logout
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    await logLogout(req.user.id, getClientIp(req), req.headers['user-agent']);
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(400).json({
      success: false,
      error: 'Refresh token is required',
    });
    return;
  }

  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.TOKEN_INVALID,
    });
    return;
  }

  // Get user
  const result = await db.query<User>(
    `SELECT * FROM users WHERE id = $1 AND status = 'active'`,
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  const user = result.rows[0];

  // Generate new tokens
  const newToken = generateToken(user);
  const newRefreshToken = generateRefreshToken(user);

  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: config.jwt.expiresIn,
    },
  });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  // Get user with branch info
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.username, u.phone, u.role, u.status,
            u.branch_id, u.avatar, u.last_login, u.created_at,
            b.name as branch_name, b.code as branch_code
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Update current user profile
 * PUT /api/v1/auth/me
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const { name, email, phone, avatar } = req.body;

  // Check if email is already taken by another user
  if (email) {
    const existingEmail = await db.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, req.user.id]
    );
    if (existingEmail.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Email is already taken',
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE users
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         avatar = COALESCE($4, avatar),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, name, email, username, phone, role, status, branch_id, avatar`,
    [name, email, phone, avatar, req.user.id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const result = await db.query<User>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    res.status(400).json({
      success: false,
      error: 'Current password is incorrect',
    });
    return;
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

  // Update password
  await db.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newPasswordHash, req.user.id]
  );

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * Register new user (admin only)
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, email, username, password, phone, role, branch_id } = req.body;

  // Check if username exists
  const existingUsername = await db.query(
    `SELECT id FROM users WHERE username = $1`,
    [username]
  );
  if (existingUsername.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: 'Username is already taken',
    });
    return;
  }

  // Check if email exists
  if (email) {
    const existingEmail = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (existingEmail.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Email is already registered',
      });
      return;
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

  // Create user
  const result = await db.query(
    `INSERT INTO users (name, email, username, password_hash, phone, role, branch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, username, phone, role, status, branch_id, created_at`,
    [name, email, username, passwordHash, phone, role, branch_id]
  );

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CREATED,
    data: result.rows[0],
  });
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email } = req.body;

  // Find user by email
  const result = await db.query(
    `SELECT id, name, email FROM users WHERE email = $1 AND status = 'active'`,
    [email]
  );

  // Always return success to prevent email enumeration
  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent',
  });

  if (result.rows.length === 0) {
    return;
  }

  // TODO: Implement actual email sending logic
  // const user = result.rows[0];
  // const resetToken = generateResetToken();
  // await sendPasswordResetEmail(user.email, resetToken);
});

/**
 * Get list of all users (admin only)
 * GET /api/v1/auth/users
 */
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { role, status, branch_id, search, page = 1, limit = 20 } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (role) {
    conditions.push(`u.role = $${paramIndex++}`);
    params.push(role);
  }

  if (status) {
    conditions.push(`u.status = $${paramIndex++}`);
    params.push(status);
  }

  if (branch_id) {
    conditions.push(`u.branch_id = $${paramIndex++}`);
    params.push(branch_id);
  }

  if (search) {
    conditions.push(`(u.name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get users
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.username, u.phone, u.role, u.status,
            u.branch_id, u.avatar, u.last_login, u.created_at,
            b.name as branch_name
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single user by ID
 * GET /api/v1/auth/users/:id
 */
export const getUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.username, u.phone, u.role, u.status,
            u.branch_id, u.avatar, u.last_login, u.created_at,
            b.name as branch_name, b.code as branch_code
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * Update user (admin only)
 * PUT /api/v1/auth/users/:id
 */
export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, phone, role, status, branch_id } = req.body;

  // Check if user exists
  const existing = await db.query(`SELECT id FROM users WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  // Check if email is taken by another user
  if (email) {
    const existingEmail = await db.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, id]
    );
    if (existingEmail.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Email is already taken',
      });
      return;
    }
  }

  const result = await db.query(
    `UPDATE users
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         role = COALESCE($4, role),
         status = COALESCE($5, status),
         branch_id = COALESCE($6, branch_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING id, name, email, username, phone, role, status, branch_id`,
    [name, email, phone, role, status, branch_id, id]
  );

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.UPDATED,
    data: result.rows[0],
  });
});

/**
 * Reset user password (admin only)
 * POST /api/v1/auth/users/:id/reset-password
 */
export const resetUserPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newPassword } = req.body;

  // Check if user exists
  const existing = await db.query(`SELECT id FROM users WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

  await db.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [passwordHash, id]
  );

  res.json({
    success: true,
    message: 'Password reset successfully',
  });
});

/**
 * Delete user (admin only)
 * DELETE /api/v1/auth/users/:id
 */
export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user && req.user.id === parseInt(id, 10)) {
    res.status(400).json({
      success: false,
      error: 'You cannot delete your own account',
    });
    return;
  }

  // Soft delete - just set status to inactive
  const result = await db.query(
    `UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.USER_NOT_FOUND,
    });
    return;
  }

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DELETED,
  });
});

export default {
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  register,
  forgotPassword,
  getUsers,
  getUser,
  updateUser,
  resetUserPassword,
  deleteUser,
};
