import request from 'supertest';
import express from 'express';
import { CSRFProtection } from '../../middleware/csrf';

// Extend Express Request type for session
declare global {
  namespace Express {
    interface Request {
      session?: { id: string };
    }
  }
}

describe('CSRF Protection', () => {
  let app: express.Application;
  let csrfProtection: CSRFProtection;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    csrfProtection = new CSRFProtection({ secret: 'test-secret' });
  });

  describe('Token Generation', () => {
    it('should generate valid CSRF token', () => {
      const sessionId = 'test-session';
      const token = csrfProtection.generateToken(sessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different sessions', () => {
      const token1 = csrfProtection.generateToken('session1');
      const token2 = csrfProtection.generateToken('session2');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const sessionId = 'test-session';
      const token = csrfProtection.generateToken(sessionId);
      
      const isValid = csrfProtection.verifyToken(token, sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject token for different session', () => {
      const token = csrfProtection.generateToken('session1');
      const isValid = csrfProtection.verifyToken(token, 'session2');
      
      expect(isValid).toBe(false);
    });

    it('should reject malformed token', () => {
      const isValid = csrfProtection.verifyToken('invalid-token', 'session');
      expect(isValid).toBe(false);
    });

    it('should reject expired token', () => {
      // Create CSRF protection with very short expiry for testing
      const shortLivedCSRF = new CSRFProtection({ secret: 'test-secret' });
      const sessionId = 'test-session';
      const token = shortLivedCSRF.generateToken(sessionId);
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 3700000); // 1 hour + 1 minute
      
      const isValid = shortLivedCSRF.verifyToken(token, sessionId);
      expect(isValid).toBe(false);
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Middleware Integration', () => {
    beforeEach(() => {
      app.use((req, _res, next) => {
        req.session = { id: 'test-session' };
        next();
      });
    });

    it('should generate token for GET requests', async () => {
      app.use(csrfProtection.generateMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['x-csrf-token']).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should verify token for POST requests', async () => {
      app.use(csrfProtection.generateMiddleware());
      app.use(csrfProtection.verifyMiddleware());
      app.post('/test', (_req, res) => res.json({ success: true }));

      // First get a token
      const tokenResponse = await request(app).get('/');
      const token = tokenResponse.headers['x-csrf-token'] as string;

      // Then use it in POST request
      const response = await request(app)
        .post('/test')
        .set('X-CSRF-Token', token)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    it('should reject POST requests without token', async () => {
      app.use(csrfProtection.verifyMiddleware());
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    it('should reject POST requests with invalid token', async () => {
      app.use(csrfProtection.verifyMiddleware());
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    it('should allow safe methods without token', async () => {
      app.use(csrfProtection.verifyMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });
});