import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';
import { User } from '../models/interfaces';

export interface JWTPayload {
  userId: string;
  username: string;
  role: User['role'];
  iat?: number;
  exp?: number;
  iss?: string;
}

export class JWTUtils {
  private static readonly SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
  private static readonly EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';
  private static readonly REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d';

  /**
   * Generate access token for user
   */
  static generateAccessToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const options: SignOptions = {
      expiresIn: this.EXPIRES_IN as StringValue,
      issuer: 'web-communication-cms'
    };
    
    return jwt.sign(payload, this.SECRET, options);
  }

  /**
   * Generate refresh token for user
   */
  static generateRefreshToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const options: SignOptions = {
      expiresIn: this.REFRESH_EXPIRES_IN as StringValue,
      issuer: 'web-communication-cms'
    };
    
    return jwt.sign(payload, this.SECRET, options);
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const options = {
        issuer: 'web-communication-cms'
      };
      
      return jwt.verify(token, this.SECRET, options) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        // Check if it's specifically an expired token error
        if (error.message.includes('expired')) {
          throw new Error('Token expired');
        }
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Check if token is expired without throwing
   */
  static isTokenExpired(token: string): boolean {
    try {
      this.verifyToken(token);
      return false;
    } catch (error) {
      // Return true for any token verification error (expired, invalid, etc.)
      return true;
    }
  }
}