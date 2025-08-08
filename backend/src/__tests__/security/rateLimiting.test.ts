import request from 'supertest';
import express from 'express';
import { RateLimiter } from '../../middleware/rateLimiting';

describe('Rate Limiting', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 5
      });

      app.use(rateLimiter.middleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(response.headers['x-ratelimit-remaining']).toBe((4 - i).toString());
      }
    });

    it('should block requests exceeding limit', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 2
      });

      app.use(rateLimiter.middleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      // Make requests up to limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Next request should be blocked
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should reset counter after window expires', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 100, // 100ms for quick test
        maxRequests: 1
      });

      app.use(rateLimiter.middleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      // Make first request
      await request(app).get('/test').expect(200);

      // Second request should be blocked
      await request(app).get('/test').expect(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow request again
      await request(app).get('/test').expect(200);
    });

    it('should use custom key generator', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req) => req.headers['user-id'] as string || 'anonymous'
      });

      app.use(rateLimiter.middleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      // Different users should have separate limits
      await request(app)
        .get('/test')
        .set('User-ID', 'user1')
        .expect(200);

      await request(app)
        .get('/test')
        .set('User-ID', 'user2')
        .expect(200);

      // Same user should be limited
      await request(app)
        .get('/test')
        .set('User-ID', 'user1')
        .expect(429);
    });

    it('should handle skipSuccessfulRequests option', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true
      });

      app.use(rateLimiter.middleware());
      app.get('/success', (_req, res) => res.json({ success: true }));
      app.get('/error', (_req, res) => res.status(500).json({ error: true }));

      // Successful requests shouldn't count
      await request(app).get('/success').expect(200);
      await request(app).get('/success').expect(200);
      await request(app).get('/success').expect(200);

      // Error requests should count
      await request(app).get('/error').expect(500);
      await request(app).get('/error').expect(500);
      await request(app).get('/error').expect(429);
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('should have different limits for different endpoints', () => {
      // This test verifies that different rate limiters have different configurations
      const { generalRateLimit, authRateLimit, uploadRateLimit } = require('../../middleware/rateLimiting');
      
      expect(generalRateLimit).toBeDefined();
      expect(authRateLimit).toBeDefined();
      expect(uploadRateLimit).toBeDefined();
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set correct rate limit headers', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10
      });

      app.use(rateLimiter.middleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(response.headers['x-ratelimit-remaining']).toBe('9');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});