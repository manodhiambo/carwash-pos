import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errors?: Record<string, string[]>) {
    super(400, message, errors);
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}

/**
 * Unprocessable entity error (422)
 */
export class UnprocessableError extends ApiError {
  constructor(message: string = 'Unprocessable entity', errors?: Record<string, string[]>) {
    super(422, message, errors);
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message, undefined, false);
  }
}

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (config.env === 'development') {
    console.error('Error:', err);
  }

  // Handle ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(config.env === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle Postgres errors
  if ('code' in err) {
    const pgError = err as Error & { code: string; detail?: string; constraint?: string };

    switch (pgError.code) {
      case '23505': // unique_violation
        res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: pgError.detail || 'A record with this value already exists',
          ...(config.env === 'development' && { constraint: pgError.constraint }),
        });
        return;

      case '23503': // foreign_key_violation
        res.status(400).json({
          success: false,
          error: 'Invalid reference',
          message: 'Referenced record does not exist',
          ...(config.env === 'development' && { detail: pgError.detail }),
        });
        return;

      case '23502': // not_null_violation
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: pgError.detail || 'A required field is missing',
        });
        return;

      case '22P02': // invalid_text_representation
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: 'Invalid data type provided',
        });
        return;

      case '42P01': // undefined_table
        console.error('Database table not found:', pgError.message);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'A database configuration error occurred',
        });
        return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'The provided token is invalid',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Your session has expired. Please login again.',
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message,
    });
    return;
  }

  // Handle syntax errors in JSON parsing
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON',
    });
    return;
  }

  // Default to 500 Internal Server Error
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : 'An unexpected error occurred',
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  ApiError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
  InternalError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
