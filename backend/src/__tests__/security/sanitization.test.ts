import { InputSanitizer } from '../../utils/sanitization';

describe('InputSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = InputSanitizer.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should remove dangerous event handlers', () => {
      const input = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = InputSanitizer.sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = InputSanitizer.sanitizeHtml(input);
      expect(result).toBe(input);
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeHtml('')).toBe('');
      expect(InputSanitizer.sanitizeHtml(null as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toContain('alert');
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('hello world');
    });

    it('should respect max length', () => {
      const input = 'a'.repeat(100);
      const result = InputSanitizer.sanitizeText(input, { maxLength: 50 });
      expect(result.length).toBe(50);
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize valid emails', () => {
      const input = '  Test.Email+tag@EXAMPLE.COM  ';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('test.email+tag@example.com');
    });

    it('should reject invalid emails', () => {
      const input = 'not-an-email';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const input = 'https://example.com/path';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe(input);
    });

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should reject URLs without protocol', () => {
      const input = 'example.com';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../etc/passwd';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).not.toContain('../');
      expect(result).toBe('etcpasswd');
    });

    it('should handle long filenames', () => {
      const input = 'a'.repeat(300) + '.txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toMatch(/\.txt$/);
    });

    it('should remove null bytes and control characters', () => {
      const input = 'file\x00name\x01.txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).toBe('filename.txt');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        title: '<script>alert("xss")</script>',
        content: {
          body: '<p>Safe content</p><script>bad()</script>',
          tags: ['<script>', 'safe-tag']
        }
      };
      
      const result = InputSanitizer.sanitizeObject(input);
      expect(result.title).not.toContain('<script>');
      expect(result.content.body).not.toContain('<script>');
      expect(result.content.tags[0]).not.toContain('<script>');
    });

    it('should handle arrays', () => {
      const input = ['<script>bad</script>', 'safe', '<img onerror="bad()">'];
      const result = InputSanitizer.sanitizeObject(input);
      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toBe('safe');
      expect(result[2]).not.toContain('onerror');
    });
  });
});