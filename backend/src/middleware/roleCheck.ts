import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { USER_ROLE_HIERARCHY, ERROR_MESSAGES } from '../utils/constants';

/**
 * Role-based access control middleware
 * Checks if the authenticated user has one of the allowed roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Check if user has minimum role level
 * Uses role hierarchy to determine access
 */
export const authorizeMinLevel = (minRole: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    const userLevel = USER_ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = USER_ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: `This action requires ${minRole} level access or higher`,
      });
      return;
    }

    next();
  };
};

/**
 * Check if user is admin (super_admin or admin)
 */
export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (req.user.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Super admin access required',
    });
    return;
  }

  next();
};

/**
 * Check if user can manage staff (admin, manager, or super_admin)
 */
export const canManageStaff = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Staff management requires manager level access or higher',
    });
    return;
  }

  next();
};

/**
 * Check if user can process payments (cashier and above)
 */
export const canProcessPayments = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin', 'manager', 'cashier', 'accountant'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Payment processing requires cashier level access or higher',
    });
    return;
  }

  next();
};

/**
 * Check if user can view reports (accountant and above)
 */
export const canViewReports = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin', 'manager', 'accountant'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Report access requires accountant level access or higher',
    });
    return;
  }

  next();
};

/**
 * Check if user can manage inventory (manager and above)
 */
export const canManageInventory = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Inventory management requires manager level access or higher',
    });
    return;
  }

  next();
};

/**
 * Check if user belongs to specific branch
 */
export const belongsToBranch = (branchIdParam: string = 'branch_id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    // Super admins can access all branches
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    const requestedBranchId = parseInt(req.params[branchIdParam] || req.body[branchIdParam], 10);

    if (requestedBranchId && req.user.branch_id !== requestedBranchId) {
      res.status(403).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'You do not have access to this branch',
      });
      return;
    }

    next();
  };
};

/**
 * Check if user can override prices
 */
export const canOverridePrice = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
    return;
  }

  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Price override requires manager level access or higher',
    });
    return;
  }

  next();
};

export default {
  authorize,
  authorizeMinLevel,
  isAdmin,
  isSuperAdmin,
  canManageStaff,
  canProcessPayments,
  canViewReports,
  canManageInventory,
  belongsToBranch,
  canOverridePrice,
};
