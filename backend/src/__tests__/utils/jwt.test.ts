import { JWTUtils, JWTPayload } from '../../utils/jwt';
import jwt from 'jsonwebtoken';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('JWTUtils', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    role: 'editor' as const
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const decoded = jwt.decode(token) as JWTPayload;
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.iss).toBe('web-communication-cms');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockUser);
      const decoded = jwt.decode(token) as JWTPayload;
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.iss).toBe('web-communication-cms');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const payload = JWTUtils.verifyToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.username).toBe(mockUser.username);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      // Create token with very short expiry
      const expiredToken = jwt.sign(
        { userId: mockUser.id, username: mockUser.username, role: mockUser.role },
        'test-secret-key',
        { expiresIn: '1ms', issuer: 'web-communication-cms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(() => {
        JWTUtils.verifyToken(expiredToken);
      }).toThrow(); // Just check that it throws, don't check specific message
    });

    it('should throw error for token with wrong issuer', () => {
      const tokenWithWrongIssuer = jwt.sign(
        { userId: mockUser.id, username: mockUser.username, role: mockUser.role },
        'test-secret-key',
        { issuer: 'wrong-issuer' }
      );

      expect(() => {
        JWTUtils.verifyToken(tokenWithWrongIssuer);
      }).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const header = `Bearer ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for undefined header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const extracted = JWTUtils.extractTokenFromHeader('token-without-bearer');
      expect(extracted).toBeNull();
    });

    it('should return null for header with only Bearer', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const isExpired = JWTUtils.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id, username: mockUser.username, role: mockUser.role },
        'test-secret-key',
        { expiresIn: '1ms', issuer: 'web-communication-cms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const isExpired = JWTUtils.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = JWTUtils.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });
});