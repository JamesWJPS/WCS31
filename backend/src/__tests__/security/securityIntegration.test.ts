import request from 'supertest';
import { app } from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testDatabase';

describe('Security Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in content creation', async () => {
      const maliciousContent = {
        title: '<script>alert("XSS")</script>Normal Title',
        body: '<p>Normal content</p><script>alert("XSS")</script>',
        templateId: 'template-1'
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send(maliciousContent);

      expect(response.status).toBe(201);
      expect(response.body.content.title).not.toContain('<script>');
      expect(response.body.content.body).not.toContain('<script>');
      expect(response.body.content.title).toContain('Normal Title');
      expect(response.body.content.body).toContain('<p>Normal content</p>');
    });

    it('should sanitize SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get('/api/content')
        .set('Authorization', 'Bearer valid-admin-token')
        .query({ search: sqlInjection });

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('DROP TABLE');
      expect(JSON.stringify(response.body)).not.toContain('--');
    });

    it('should prevent path traversal in file operations', async () => {
      const traversalAttempt = '../../../etc/passwd';
      
      const response = await request(app)
        .get(`/api/files/${encodeURIComponent(traversalAttempt)}`)
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain('../');
    });
  });

  describe('File Upload Security', () => {
    it('should reject executable files', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .attach('file', Buffer.from('malicious content'), 'malware.exe');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('EXECUTABLE_FILE_BLOCKED');
    });

    it('should reject files with double extensions', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .attach('file', Buffer.from('malicious content'), 'document.pdf.exe');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('DOUBLE_EXTENSION_BLOCKED');
    });

    it('should validate file content matches extension', async () => {
      // Create a fake PDF (just text content with PDF extension)
      const fakeContent = 'This is not a real PDF file';
      
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .attach('file', Buffer.from(fakeContent), 'document.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FILE_CONTENT_MISMATCH');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ title: 'Test', body: 'Test content', templateId: 'template-1' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject invalid CSRF tokens', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ title: 'Test', body: 'Test content', templateId: 'template-1' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication attempts', async () => {
      const requests = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'invalid', password: 'invalid' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on file uploads', async () => {
      const requests = [];
      
      // Make multiple upload attempts
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/documents/upload')
            .set('Authorization', 'Bearer valid-admin-token')
            .set('X-CSRF-Token', 'valid-csrf-token')
            .attach('file', Buffer.from('test content'), 'test.txt')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Security', () => {
    it('should prevent JWT token manipulation', async () => {
      const manipulatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIn0.invalid-signature';
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${manipulatedToken}`);

      expect(response.status).toBe(401);
    });

    it('should prevent privilege escalation', async () => {
      // Try to access admin endpoint with editor token
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-editor-token');

      expect(response.status).toBe(403);
    });
  });

  describe('Data Validation', () => {
    it('should validate email formats', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          username: 'testuser',
          email: 'invalid-email-format',
          password: 'ValidPassword123!',
          role: 'editor'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });

    it('should enforce password complexity', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak',
          role: 'editor'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('password');
    });
  });

  describe('Content Security', () => {
    it('should prevent prototype pollution', async () => {
      const pollutionAttempt = {
        title: 'Test',
        body: 'Test content',
        templateId: 'template-1',
        '__proto__': { 'isAdmin': true }
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', 'Bearer valid-editor-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send(pollutionAttempt);

      expect(response.status).toBe(201);
      expect(response.body.received).toBeUndefined();
      expect(Object.prototype).not.toHaveProperty('isAdmin');
    });

    it('should sanitize template data', async () => {
      const maliciousTemplate = {
        name: '<script>alert("XSS")</script>Template',
        htmlStructure: '<div>{{content}}</div><script>alert("XSS")</script>',
        cssStyles: 'body { background: url("javascript:alert(\'XSS\')"); }'
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send(maliciousTemplate);

      expect(response.status).toBe(201);
      expect(response.body.template.name).not.toContain('<script>');
      expect(response.body.template.htmlStructure).not.toContain('<script>');
      expect(response.body.template.cssStyles).not.toContain('javascript:');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain('stack');
      expect(JSON.stringify(response.body)).not.toContain('password');
      expect(JSON.stringify(response.body)).not.toContain('secret');
    });

    it('should handle database errors securely', async () => {
      // This would trigger a database error in a real scenario
      const response = await request(app)
        .get('/api/content/invalid-id-format')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).not.toContain('database');
      expect(JSON.stringify(response.body)).not.toContain('SQL');
    });
  });
});