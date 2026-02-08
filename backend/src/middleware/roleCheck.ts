import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to check if user is admin (manager, branch_manager, or super_admin)
 */
export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user has manager or higher role
 */
export const isManager = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Manager role or higher required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is super admin
 */
export const isSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'super_admin') {
    res.status(403).json({ success: false, error: 'Super admin access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can manage staff
 */
export const canManageStaff = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions to manage staff' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can view reports
 */
export const canViewReports = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin', 'cashier'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions to view reports' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can manage inventory
 */
export const canManageInventory = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions to manage inventory' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can override prices
 */
export const canOverridePrice = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions to override prices' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can process payments
 */
export const canProcessPayments = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['cashier', 'manager', 'branch_manager', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions to process payments' });
    return;
  }

  next();
};
