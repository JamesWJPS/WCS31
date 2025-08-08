import request from 'supertest';
import express from 'express';
import { applySecurity } from '../../middleware/security';
import { InputSanitizer } from '../../utils/sanitization';

describe('Penetration Testing Scenarios', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    applySecurity(app);
  });

  describe('XSS Attack Scenarios', () => {
    beforeEach(() => {
      app.post('/api/content', (req, res) => {
        // Simulate content creation endpoint
        const sanitized = InputSanitizer.sanitizeHtml(req.body.content);
        res.json({ content: sanitized });
      });
    });

    it('should prevent script injection in content', async () => {
      const maliciousContent = '<script>alert("XSS")</script><p>Normal content</p>';
      
      const response = await request(app)
        .post('/api/content')
        .send({ content: maliciousContent });

      expect(response.body.content).not.toContain('<script>');
      expect(response.body.content).toContain('<p>Normal content</p>');
    });

    it('should prevent event handler injection', async () => {
      const maliciousContent = '<img src="x" onerror="alert(\'XSS\')" />';
      
      const response = await request(app)
        .post('/api/content')
        .send({ content: maliciousContent });

      expect(response.body.content).not.toContain('onerror');
    });

    it('should prevent javascript: URL injection', async () => {
      const maliciousContent = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      
      const response = await request(app)
        .post('/api/content')
        .send({ content: maliciousContent });

      expect(response.body.content).not.toContain('javascript:');
    });

    it('should prevent data: URL with script injection', async () => {
      const maliciousContent = '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>';
      
      const response = await request(app)
        .post('/api/content')
        .send({ content: maliciousContent });

      expect(response.body.content).not.toContain('<iframe>');
      expect(response.body.content).not.toContain('<script>');
    });
  });

  describe('SQL Injection Attack Scenarios', () => {
    beforeEach(() => {
      app.get('/api/users', (req, res) => {
        // Simulate user search endpoint
        const searchTerm = req.query['search'] as string;
        res.json({ searchTerm, message: 'Search completed' });
      });
    });

    it('should sanitize SQL injection attempts in query parameters', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get('/api/users')
        .query({ search: sqlInjection });

      expect(response.body.searchTerm).not.toContain('DROP TABLE');
      expect(response.body.searchTerm).not.toContain('--');
    });

    it('should handle UNION-based injection attempts', async () => {
      const unionInjection = "' UNION SELECT password FROM users WHERE '1'='1";
      
      const response = await request(app)
        .get('/api/users')
        .query({ search: unionInjection });

      expect(response.body.searchTerm).not.toContain('UNION');
      expect(response.body.searchTerm).not.toContain('SELECT');
    });
  });

  describe('Path Traversal Attack Scenarios', () => {
    beforeEach(() => {
      app.get('/api/files/:filename', (req, res) => {
        const filename = req.params.filename;
        res.json({ filename, message: 'File request processed' });
      });
    });

    it('should prevent directory traversal attempts', async () => {
      const traversalAttempt = '../../../etc/passwd';
      
      const response = await request(app)
        .get(`/api/files/${encodeURIComponent(traversalAttempt)}`);

      expect(response.body.filename).not.toContain('../');
    });

    it('should prevent Windows path traversal', async () => {
      const windowsTraversal = '..\\..\\..\\windows\\system32\\config\\sam';
      
      const response = await request(app)
        .get(`/api/files/${encodeURIComponent(windowsTraversal)}`);

      expect(response.body.filename).not.toContain('..\\');
    });

    it('should prevent null byte injection', async () => {
      const nullByteInjection = 'file.txt\x00.exe';
      
      const response = await request(app)
        .get(`/api/files/${encodeURIComponent(nullByteInjection)}`);

      expect(response.body.filename).not.toContain('\x00');
    });
  });

  describe('CSRF Attack Scenarios', () => {
    beforeEach(() => {
      app.post('/api/admin/delete-user', (_req, res) => {
        res.json({ message: 'User deletion attempted' });
      });
    });

    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/admin/delete-user')
        .send({ userId: '123' });

      expect(response.status).toBe(403);
    });

    it('should reject requests with invalid CSRF tokens', async () => {
      const response = await request(app)
        .post('/api/admin/delete-user')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ userId: '123' });

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting Attack Scenarios', () => {
    beforeEach(() => {
      app.post('/api/auth/login', (_req, res) => {
        res.json({ message: 'Login attempt' });
      });
    });

    it('should prevent brute force attacks on login', async () => {
      const requests = [];
      
      // Attempt multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'wrong' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload Attack Scenarios', () => {
    beforeEach(() => {
      app.post('/api/upload', (_req, res) => {
        res.json({ message: 'File upload processed' });
      });
    });

    it('should prevent executable file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('malicious content'), 'malware.exe');

      expect(response.status).toBe(400);
    });

    it('should prevent script file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('<script>alert("xss")</script>'), 'script.js');

      expect(response.status).toBe(400);
    });

    it('should prevent PHP file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'shell.php');

      expect(response.status).toBe(400);
    });
  });

  describe('HTTP Header Injection Scenarios', () => {
    beforeEach(() => {
      app.get('/api/redirect', (req, res) => {
        const url = req.query['url'] as string;
        if (url) {
          res.redirect(url);
        } else {
          res.json({ message: 'No URL provided' });
        }
      });
    });

    it('should prevent header injection through redirects', async () => {
      const headerInjection = 'http://example.com\r\nSet-Cookie: admin=true';
      
      const response = await request(app)
        .get('/api/redirect')
        .query({ url: headerInjection });

      expect(response.headers['set-cookie']).not.toContain('admin=true');
    });
  });

  describe('JSON Injection Scenarios', () => {
    beforeEach(() => {
      app.post('/api/data', (req, res) => {
        res.json({ received: req.body });
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/data')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}');

      expect(response.status).toBe(400);
    });

    it('should prevent prototype pollution', async () => {
      const pollutionAttempt = {
        "__proto__": {
          "isAdmin": true
        },
        "data": "normal"
      };
      
      const response = await request(app)
        .post('/api/data')
        .send(pollutionAttempt);

      expect(response.body.received.__proto__).toBeUndefined();
    });
  });

  describe('Command Injection Scenarios', () => {
    beforeEach(() => {
      app.post('/api/process', (req, res) => {
        const filename = req.body.filename;
        res.json({ filename, message: 'Processing file' });
      });
    });

    it('should prevent command injection in filenames', async () => {
      const commandInjection = 'file.txt; rm -rf /';
      
      const response = await request(app)
        .post('/api/process')
        .send({ filename: commandInjection });

      expect(response.body.filename).not.toContain(';');
      expect(response.body.filename).not.toContain('rm -rf');
    });

    it('should prevent pipe-based command injection', async () => {
      const pipeInjection = 'file.txt | cat /etc/passwd';
      
      const response = await request(app)
        .post('/api/process')
        .send({ filename: pipeInjection });

      expect(response.body.filename).not.toContain('|');
      expect(response.body.filename).not.toContain('cat');
    });
  });

  describe('LDAP Injection Scenarios', () => {
    beforeEach(() => {
      app.post('/api/ldap-search', (req, res) => {
        const searchFilter = req.body.filter;
        res.json({ filter: searchFilter, message: 'LDAP search processed' });
      });
    });

    it('should prevent LDAP injection attempts', async () => {
      const ldapInjection = '(|(uid=*)(password=*))';
      
      const response = await request(app)
        .post('/api/ldap-search')
        .send({ filter: ldapInjection });

      expect(response.body.filter).not.toContain('(|(uid=*)');
    });
  });

  describe('XML Injection Scenarios', () => {
    beforeEach(() => {
      app.post('/api/xml', (req, res) => {
        const xmlData = req.body.xml;
        res.json({ xml: xmlData, message: 'XML processed' });
      });
    });

    it('should prevent XXE (XML External Entity) attacks', async () => {
      const xxePayload = `<?xml version="1.0"?>
        <!DOCTYPE root [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>&xxe;</root>`;
      
      const response = await request(app)
        .post('/api/xml')
        .send({ xml: xxePayload });

      expect(response.body.xml).not.toContain('<!ENTITY');
      expect(response.body.xml).not.toContain('SYSTEM');
    });
  });
});