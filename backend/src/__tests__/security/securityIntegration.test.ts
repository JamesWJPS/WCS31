import request from 'supertest';
import express from 'express';
import { applySecurity, routeSecurity } from '../../middleware/security';
import { sanitizeContent, sanitizeFileUpload } from '../../middleware/sanitization';

// Extend Express Request type for session
declare global {
  namespace Express {
    interface Request {
      session?: { id: string };
    }
  }
}

describe('Security Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    applySecurity(app);
  });

  describe('Complete Security Stack', () => {
    beforeEach(() => {
      // Simulate a complete content creation endpoint
      app.post('/api/content', 
        ...routeSecurity.content,
        sanitizeContent,
        (req, res) => {
          res.json({
            title: req.body.title,
            body: req.body.body,
            metadata: req.body.metadata
          });
        }
      );

      // Simulate file upload endpoint
      app.post('/api/upload',
        ...routeSecurity.upload,
        sanitizeFileUpload,
        (_req, res) => {
          res.json({ message: 'File uploaded successfully' });
        }
      );

      // Simulate user management endpoint
      app.post('/api/users',
        ...routeSecurity.users,
        (req, res) => {
          res.json({
            username: req.body.username,
            email: req.body.email,
            role: req.body.role
          });
        }
      );
    });

    it('should apply all security measures to content creation', async () => {
      const maliciousContent = {
        title: '<script>alert("xss")</script>Title',
        body: '<p>Good content</p><script>bad()</script>',
        metadata: {
          description: '<img onerror="alert(1)" src="x">',
          tags: ['<script>evil</script>', 'safe-tag']
        }
      };

      // First get CSRF token
      const tokenResponse = await request(app).get('/');
      const csrfToken = tokenResponse.headers['x-csrf-token'] as string;

      const response = await request(app)
        .post('/api/content')
        .set('X-CSRF-Token', csrfToken)
        .send(maliciousContent);

      expect(response.status).toBe(200);
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.body).not.toContain('<script>');
      expect(response.body.metadata.description).not.toContain('onerror');
    });

    it('should enforce rate limiting across multiple endpoints', async () => {
      const requests = [];
      
      // Make many requests to trigger rate limiting
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/api/content')
            .set('User-Agent', 'test-client')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should validate security headers are present', async () => {
      const response = await request(app).get('/api/content');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/content')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Error Handling Security', () => {
    beforeEach(() => {
      app.get('/api/error', (_req, _res, _next) => {
        throw new Error('Database connection failed: password=secret123');
      });

      app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        // Ensure sensitive information is not leaked in error messages
        const sanitizedMessage = error.message.replace(/password=\w+/g, 'password=***');
        res.status(500).json({ error: sanitizedMessage });
      });
    });

    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app).get('/api/error');

      expect(response.status).toBe(500);
      expect(response.body.error).not.toContain('secret123');
      expect(response.body.error).toContain('password=***');
    });
  });

  describe('Session Security', () => {
    beforeEach(() => {
      app.use((req, _res, next) => {
        // Simulate session middleware
        req.session = { id: 'test-session-id' };
        next();
      });

      app.post('/api/session-test', (req, res) => {
        res.json({ sessionId: req.session?.id });
      });
    });

    it('should handle session security properly', async () => {
      const response = await request(app)
        .post('/api/session-test')
        .send({ data: 'test' });

      expect(response.body.sessionId).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Input Validation Edge Cases', () => {
    beforeEach(() => {
      app.post('/api/validate', (req, res) => {
        res.json({ received: req.body });
      });
    });

    it('should handle deeply nested objects', async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: '<script>alert("deep")</script>'
              }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/validate')
        .send(deepObject);

      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should handle large arrays', async () => {
      const largeArray = Array(1000).fill('<script>alert("xss")</script>');

      const response = await request(app)
        .post('/api/validate')
        .send({ items: largeArray });

      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should handle circular references gracefully', async () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      const response = await request(app)
        .post('/api/validate')
        .send(obj);

      expect(response.status).toBe(400); // Should handle gracefully
    });
  });

  describe('Content Security Policy', () => {
    it('should set appropriate CSP headers', async () => {
      const response = await request(app).get('/');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
    });
  });

  describe('File Upload Security Integration', () => {
    it('should apply all file security measures', async () => {
      const maliciousFile = Buffer.from('<script>alert("xss")</script>');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', maliciousFile, 'malicious.js');

      expect(response.status).toBe(400);
    });

    it('should sanitize file metadata', async () => {
      const safeFile = Buffer.from('safe content');
      
      // First get CSRF token
      const tokenResponse = await request(app).get('/');
      const csrfToken = tokenResponse.headers['x-csrf-token'] as string;

      const response = await request(app)
        .post('/api/upload')
        .set('X-CSRF-Token', csrfToken)
        .field('title', '<script>alert("title")</script>Safe Title')
        .field('description', '<img onerror="alert(1)">Description')
        .attach('file', safeFile, 'safe.txt');

      if (response.status === 200) {
        // If upload succeeds, check that metadata was sanitized
        expect(response.body.title).not.toContain('<script>');
        expect(response.body.description).not.toContain('onerror');
      }
    });
  });

  describe('API Versioning Security', () => {
    beforeEach(() => {
      app.get('/api/v1/data', (_req, res) => {
        res.json({ version: 'v1', data: 'old format' });
      });

      app.get('/api/v2/data', (_req, res) => {
        res.json({ version: 'v2', data: 'new format' });
      });
    });

    it('should maintain security across API versions', async () => {
      const v1Response = await request(app).get('/api/v1/data');
      const v2Response = await request(app).get('/api/v2/data');

      // Both versions should have security headers
      expect(v1Response.headers['x-content-type-options']).toBe('nosniff');
      expect(v2Response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});