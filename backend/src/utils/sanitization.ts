import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  stripTags?: boolean;
}

export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string, options: { allowedTags?: string[], allowedAttributes?: string[] } = {}): string {
    if (!input) return '';
    
    const config = {
      ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: options.allowedAttributes || ['href', 'title', 'alt', 'class', 'id'],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
    };
    
    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string, options: SanitizationOptions = {}): string {
    if (!input) return '';
    
    let sanitized = input;
    
    // Remove HTML tags if not allowed
    if (!options.allowHtml || options.stripTags) {
      sanitized = validator.stripLow(sanitized);
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Remove dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);
    
    // Escape HTML entities
    sanitized = validator.escape(sanitized);
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Apply length limit
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Remove dangerous patterns from input
   */
  private static removeDangerousPatterns(input: string): string {
    let sanitized = input;
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/gi
    ];
    
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Remove XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi
    ];
    
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Remove path traversal patterns
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\\\/]/g, '');
    
    // Remove command injection patterns
    const commandPatterns = [
      /[;&|`$(){}[\]]/g,
      /\b(rm|del|format|fdisk|cat|type|more|less|head|tail)\b/gi
    ];
    
    commandPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    const sanitized = validator.normalizeEmail(email.trim()) || '';
    return validator.isEmail(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';
    
    const sanitized = url.trim();
    
    // Check if URL is valid and safe
    if (validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })) {
      return sanitized;
    }
    
    return '';
  }

  /**
   * Sanitize filename for safe file operations
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';
    
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\\\/]/g, '');
    
    // Remove dangerous characters and patterns
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f;$`&(){}[\]]/g, '');
    
    // Remove executable extensions and dangerous patterns
    const dangerousExtensions = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp|sh|ps1)$/i;
    if (dangerousExtensions.test(sanitized)) {
      sanitized = sanitized.replace(dangerousExtensions, '.txt');
    }
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }
    
    return sanitized.trim();
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitizeText(obj, options);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }
    
    return obj;
  }
}