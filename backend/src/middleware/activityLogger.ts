import { Response, NextFunction } from 'express';
import db from '../config/database';
import { AuthenticatedRequest, ActivityAction } from '../types';

interface ActivityLogData {
  userId?: number;
  action: ActivityAction;
  entityType: string;
  entityId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log activity to the database
 */
export const logActivity = async (data: ActivityLogData): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.userId,
        data.action,
        data.entityType,
        data.entityId,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
        data.ipAddress,
        data.userAgent,
      ]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
};

/**
 * Get client IP address from request
 */
export const getClientIp = (req: AuthenticatedRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Middleware to log all API requests
 */
export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      ip: getClientIp(req),
    };

    // Only log in development or for errors
    if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${logData.method} ${logData.url} - ${logData.status} (${logData.duration})`);
    }
  });

  next();
};

/**
 * Middleware factory to log specific actions
 */
export const logActionMiddleware = (action: ActivityAction, entityType: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = (body: Record<string, unknown>) => {
      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id ? parseInt(req.params.id, 10) : (body as { data?: { id?: number } })?.data?.id;

        logActivity({
          userId: req.user?.id,
          action,
          entityType,
          entityId,
          newValues: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'],
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Log create action
 */
export const logCreate = (entityType: string) => logActionMiddleware('create', entityType);

/**
 * Log update action
 */
export const logUpdate = (entityType: string) => logActionMiddleware('update', entityType);

/**
 * Log delete action
 */
export const logDelete = (entityType: string) => logActionMiddleware('delete', entityType);

/**
 * Log payment action
 */
export const logPayment = () => logActionMiddleware('payment', 'payment');

/**
 * Log view action for sensitive data
 */
export const logView = (entityType: string) => logActionMiddleware('view', entityType);

/**
 * Log login action
 */
export const logLogin = async (userId: number, ipAddress: string, userAgent?: string): Promise<void> => {
  await logActivity({
    userId,
    action: 'login',
    entityType: 'user',
    entityId: userId,
    ipAddress,
    userAgent,
  });
};

/**
 * Log logout action
 */
export const logLogout = async (userId: number, ipAddress: string, userAgent?: string): Promise<void> => {
  await logActivity({
    userId,
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    ipAddress,
    userAgent,
  });
};

/**
 * Log price override action
 */
export const logPriceOverride = async (
  userId: number,
  jobId: number,
  oldPrice: number,
  newPrice: number,
  ipAddress: string
): Promise<void> => {
  await logActivity({
    userId,
    action: 'override',
    entityType: 'job',
    entityId: jobId,
    oldValues: { price: oldPrice },
    newValues: { price: newPrice },
    ipAddress,
  });
};

/**
 * Log refund action
 */
export const logRefund = async (
  userId: number,
  paymentId: number,
  amount: number,
  reason: string,
  ipAddress: string
): Promise<void> => {
  await logActivity({
    userId,
    action: 'refund',
    entityType: 'payment',
    entityId: paymentId,
    newValues: { amount, reason },
    ipAddress,
  });
};

/**
 * Log void action
 */
export const logVoid = async (
  userId: number,
  entityType: string,
  entityId: number,
  reason: string,
  ipAddress: string
): Promise<void> => {
  await logActivity({
    userId,
    action: 'void',
    entityType,
    entityId,
    newValues: { reason },
    ipAddress,
  });
};

/**
 * Log export action
 */
export const logExport = async (
  userId: number,
  reportType: string,
  filters: Record<string, unknown>,
  ipAddress: string
): Promise<void> => {
  await logActivity({
    userId,
    action: 'export',
    entityType: 'report',
    newValues: { reportType, filters },
    ipAddress,
  });
};

/**
 * Get activity logs with filtering
 */
export const getActivityLogs = async (filters: {
  userId?: number;
  action?: ActivityAction;
  entityType?: string;
  entityId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: number;
    user_id: number;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: number;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    ip_address: string;
    created_at: Date;
  }>;
  total: number;
}> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`al.user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }

  if (filters.action) {
    conditions.push(`al.action = $${paramIndex++}`);
    params.push(filters.action);
  }

  if (filters.entityType) {
    conditions.push(`al.entity_type = $${paramIndex++}`);
    params.push(filters.entityType);
  }

  if (filters.entityId) {
    conditions.push(`al.entity_id = $${paramIndex++}`);
    params.push(filters.entityId);
  }

  if (filters.startDate) {
    conditions.push(`al.created_at >= $${paramIndex++}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`al.created_at <= $${paramIndex++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM activity_logs al ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get logs with user info
  const logsResult = await db.query(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows,
    total,
  };
};

export default {
  logActivity,
  getClientIp,
  requestLogger,
  logActionMiddleware,
  logCreate,
  logUpdate,
  logDelete,
  logPayment,
  logView,
  logLogin,
  logLogout,
  logPriceOverride,
  logRefund,
  logVoid,
  logExport,
  getActivityLogs,
};
