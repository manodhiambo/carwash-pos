import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string[]> = {};

    errors.array().forEach((error: ValidationError) => {
      const field = 'path' in error ? error.path : 'unknown';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(error.msg);
    });

    // Log validation errors for debugging
    console.error('=== VALIDATION ERROR ===');
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Body:', JSON.stringify(req.body, null, 2));
    console.error('Errors:', JSON.stringify(formattedErrors, null, 2));
    console.error('======================');

    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: formattedErrors,
    });
    return;
  }

  next();
};

/**
 * Middleware to sanitize request body
 * Removes undefined and null values, trims strings
 */
export const sanitizeBody = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        sanitized[key] = trimmed;
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to validate content type for JSON requests
 */
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      // Allow multipart/form-data for file uploads
      if (contentType && contentType.includes('multipart/form-data')) {
        next();
        return;
      }

      res.status(415).json({
        success: false,
        error: 'Content-Type must be application/json',
      });
      return;
    }
  }

  next();
};

/**
 * Middleware to check required fields
 */
export const requireFields = (...fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    for (const field of fields) {
      if (!(field in req.body) || req.body[field] === undefined || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate ID parameter
 */
export const validateIdParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = parseInt(req.params[paramName], 10);

    if (isNaN(id) || id < 1) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: `Invalid ${paramName}: must be a positive integer`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate pagination query parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (isNaN(page) || page < 1) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      message: 'Page must be a positive integer',
    });
    return;
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      message: 'Limit must be between 1 and 100',
    });
    return;
  }

  // Attach validated values to request
  (req as Request & { pagination: { page: number; limit: number } }).pagination = {
    page,
    limit,
  };

  next();
};

/**
 * Middleware to validate date range query parameters
 */
export const validateDateRange = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { start_date, end_date } = req.query;

  if (start_date) {
    const startDate = new Date(start_date as string);
    if (isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Invalid start_date format',
      });
      return;
    }
  }

  if (end_date) {
    const endDate = new Date(end_date as string);
    if (isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'Invalid end_date format',
      });
      return;
    }
  }

  if (start_date && end_date) {
    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);
    if (startDate > endDate) {
      res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        message: 'start_date cannot be after end_date',
      });
      return;
    }
  }

  next();
};

export default {
  handleValidation,
  sanitizeBody,
  validateContentType,
  requireFields,
  validateIdParam,
  validatePagination,
  validateDateRange,
};
