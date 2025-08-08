import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  AppError, 
  ValidationError_Custom, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  ConflictError, 
  RateLimitError,
  asyncHandler,
  notFoundHandler,
  timeoutHandler,
  rateLimitHandler
} from '../../middleware/errorHandler';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      headers: {},
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('AppError Class', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('creates error with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_CODE', { field: 'test' });
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ field: 'test' });
    });

    it('generates correct default codes for status codes', () => {
      expect(new AppError('Test', 400).code).toBe('BAD_REQUEST');
      expect(new AppError('Test', 401).code).toBe('UNAUTHORIZED');
      expect(new AppError('Test', 403).code).toBe('FORBIDDEN');
      expect(new AppError('Test', 404).code).toBe('NOT_FOUND');
      expect(new AppError('Test', 409).code).toBe('CONFLICT');
      expect(new AppError('Test', 422).code).toBe('VALIDATION_ERROR');
      expect(new AppError('Test', 429).code).toBe('RATE_LIMITED');
      expect(new AppError('Test', 500).code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Specific Error Classes', () => {
    it('creates ValidationError correctly', () => {
      const error = new ValidationError_Custom('Validation failed', { field: 'email' });
      
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('creates NotFoundError correctly', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('creates UnauthorizedError correctly', () => {
      const error = new UnauthorizedError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('creates ForbiddenError correctly', () => {
      const error = new ForbiddenError();
      
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('creates ConflictError correctly', () => {
      const error = new ConflictError('Resource exists', { field: 'email' });
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('creates RateLimitError correctly', () => {
      const error = new RateLimitError();
      
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });
  });

  describe('Error Handler', () => {
    it('handles AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          timestamp: expect.any(String),
        },
      });
    });

    it('converts unknown errors to AppError', () => {
      const error = new Error('Unknown error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unknown error',
          timestamp: expect.any(String),
        },
      });
    });

    it('handles CastError', () => {
      const error = { name: 'CastError', message: 'Cast failed' };
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_DATA_FORMAT',
          message: 'Invalid data format',
          timestamp: expect.any(String),
        },
      });
    });

    it('handles ValidationError', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password too short' },
        },
      };
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            email: 'Email is required',
            password: 'Password too short',
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('handles duplicate key error', () => {
      const error = {
        code: 11000,
        keyValue: { email: 'test@example.com' },
      };
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: "email 'test@example.com' already exists",
          details: {
            field: 'email',
            value: 'test@example.com',
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('handles JWT errors', () => {
      const jwtError = { name: 'JsonWebTokenError' };
      const expiredError = { name: 'TokenExpiredError' };
      
      errorHandler(jwtError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      
      errorHandler(expiredError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('includes stack trace in development mode', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      
      const error = new AppError('Test error');
      error.stack = 'Error stack trace';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Test error',
          timestamp: expect.any(String),
          stack: 'Error stack trace',
          request: expect.any(Object),
        },
      });
      
      process.env['NODE_ENV'] = originalEnv;
    });

    it('logs errors with appropriate level', () => {
      // Server error (500)
      const serverError = new AppError('Server error', 500);
      errorHandler(serverError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(console.error).toHaveBeenCalled();
      
      // Client error (400)
      const clientError = new AppError('Client error', 400);
      errorHandler(clientError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Async Handler', () => {
    it('catches async errors and passes to next', async () => {
      const asyncFunction = async () => {
        throw new Error('Async error');
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('handles successful async operations', async () => {
      const asyncFunction = async (_req: Request, res: Response) => {
        res.json({ success: true });
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Not Found Handler', () => {
    it('creates 404 error for undefined routes', () => {
      mockRequest.originalUrl = '/undefined-route';
      
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route /undefined-route not found',
        })
      );
    });
  });

  describe('Timeout Handler', () => {
    it('creates timeout error after specified time', (done) => {
      const timeout = 100;
      const timeoutMiddleware = timeoutHandler(timeout);
      
      // Mock response that never finishes
      mockResponse.headersSent = false;
      mockResponse.on = jest.fn();
      
      timeoutMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 408,
            code: 'REQUEST_TIMEOUT',
          })
        );
        done();
      }, timeout + 10);
    });

    it('clears timeout when response finishes', () => {
      const timeoutMiddleware = timeoutHandler(1000);
      
      let finishCallback: () => void;
      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });
      
      timeoutMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response finishing
      finishCallback!();
      
      // Wait a bit and ensure next wasn't called
      setTimeout(() => {
        expect(mockNext).not.toHaveBeenCalled();
      }, 50);
    });
  });

  describe('Rate Limit Handler', () => {
    it('returns rate limit error response', () => {
      rateLimitHandler(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests from this IP, please try again later',
          timestamp: expect.any(String),
        },
      });
    });
  });
});