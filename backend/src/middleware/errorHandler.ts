import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../models/validation';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'UNKNOWN_ERROR';
    }
  }
}

// Specific error classes
export class ValidationError_Custom extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

// Error response formatter
const formatErrorResponse = (error: ApiError, req: Request) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: any = {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  };

  // Add details if available
  if (error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request context in development
  if (isDevelopment) {
    response.error.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    };
  }

  return response;
};

// Log error details
const logError = (error: ApiError, req: Request) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    user: req.user ? {
      userId: req.user.userId,
      role: req.user.role,
    } : null,
  };

  // Log based on error severity
  if (error.statusCode && error.statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (error.statusCode && error.statusCode >= 400) {
    console.warn('Client Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.log('Error:', JSON.stringify(errorInfo, null, 2));
  }

  // In production, send to error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error monitoring service (e.g., Sentry, DataDog)
    // errorMonitoringService.captureError(error, errorInfo);
  }
};

// Handle different types of errors
const handleCastError = (error: any): AppError => {
  return new AppError('Invalid data format', 400, 'INVALID_DATA_FORMAT');
};

const handleValidationError = (error: any): AppError => {
  const details: Record<string, string> = {};
  
  if (error.errors) {
    Object.keys(error.errors).forEach(key => {
      details[key] = error.errors[key].message;
    });
  }

  return new ValidationError_Custom('Validation failed', details);
};

const handleDuplicateKeyError = (error: any): AppError => {
  const field = Object.keys(error.keyValue || {})[0];
  const value = error.keyValue?.[field];
  
  return new ConflictError(
    `${field} '${value}' already exists`,
    { field, value }
  );
};

const handleJWTError = (): AppError => {
  return new UnauthorizedError('Invalid authentication token');
};

const handleJWTExpiredError = (): AppError => {
  return new UnauthorizedError('Authentication token has expired');
};

// Main error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = error;

  // Convert known error types to AppError
  if (error.name === 'CastError') {
    err = handleCastError(error);
  } else if (error.name === 'ValidationError') {
    err = handleValidationError(error);
  } else if (error.code === 11000) {
    err = handleDuplicateKeyError(error);
  } else if (error.name === 'JsonWebTokenError') {
    err = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    err = handleJWTExpiredError();
  } else if (!(error instanceof AppError)) {
    // Convert unknown errors to AppError
    err = new AppError(
      error.message || 'Something went wrong',
      error.statusCode || 500,
      error.code,
      undefined,
      false // Not operational since it's unexpected
    );
  }

  // Log the error
  logError(err, req);

  // Send error response
  const statusCode = err.statusCode || 500;
  const response = formatErrorResponse(err, req);

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Promise Rejection:', reason);
    
    // Log the error
    const errorInfo = {
      timestamp: new Date().toISOString(),
      type: 'unhandledRejection',
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    };
    
    console.error('Unhandled Rejection Details:', JSON.stringify(errorInfo, null, 2));
    
    // Gracefully close the server
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    
    // Log the error
    const errorInfo = {
      timestamp: new Date().toISOString(),
      type: 'uncaughtException',
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    
    console.error('Uncaught Exception Details:', JSON.stringify(errorInfo, null, 2));
    
    // Exit the process
    process.exit(1);
  });
};

// Request timeout handler
export const timeoutHandler = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError(
          'Request timeout',
          408,
          'REQUEST_TIMEOUT'
        );
        next(error);
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

// Rate limiting error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  const error = new RateLimitError('Too many requests from this IP, please try again later');
  const response = formatErrorResponse(error, req);
  
  logError(error, req);
  res.status(429).json(response);
};

// Health check for error monitoring
export const healthCheck = (req: Request, res: Response) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  };

  res.json(health);
};