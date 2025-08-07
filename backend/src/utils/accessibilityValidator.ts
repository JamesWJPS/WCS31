/**
 * WCAG 2.2 Accessibility validation utilities
 */

import { JSDOM } from 'jsdom';

export interface AccessibilityIssue {
  level: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  element?: string;
  line?: number;
}

export interface AccessibilityReport {
  isCompliant: boolean;
  issues: AccessibilityIssue[];
  score: number; // 0-100
}

export class AccessibilityValidator {
  /**
   * Validates HTML content for WCAG 2.2 compliance
   */
  static validate(html: string): AccessibilityReport {
    const issues: AccessibilityIssue[] = [];
    
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Run all validation checks
      this.checkImages(document, issues);
      this.checkHeadings(document, issues);
      this.checkLinks(document, issues);
      this.checkForms(document, issues);
      this.checkColorContrast(document, issues);
      this.checkKeyboardNavigation(document, issues);
      this.checkLandmarks(document, issues);
      this.checkLanguage(document, issues);
      this.checkPageTitle(document, issues);
      this.checkSkipLinks(document, issues);

      // Calculate compliance score
      const errorCount = issues.filter(issue => issue.level === 'error').length;
      const warningCount = issues.filter(issue => issue.level === 'warning').length;
      
      // Score calculation: start at 100, deduct points for issues
      let score = 100;
      score -= errorCount * 10; // 10 points per error
      score -= warningCount * 5; // 5 points per warning
      score = Math.max(0, score);

      const isCompliant = errorCount === 0 && warningCount <= 2; // Allow minor warnings

      return {
        isCompliant,
        issues,
        score,
      };
    } catch (error) {
      return {
        isCompliant: false,
        issues: [{
          level: 'error',
          rule: 'VALIDATION_ERROR',
          message: `Failed to validate HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        score: 0,
      };
    }
  }

  /**
   * Check image accessibility (WCAG 1.1.1)
   */
  private static checkImages(document: Document, issues: AccessibilityIssue[]): void {
    const images = document.querySelectorAll('img');
    
    images.forEach((img, index) => {
      // Check for alt attribute
      if (!img.hasAttribute('alt')) {
        issues.push({
          level: 'error',
          rule: 'WCAG_1.1.1',
          message: 'Image missing alt attribute',
          element: `img[${index}]`,
        });
      }

      // Check for meaningful alt text (not just filename)
      const alt = img.getAttribute('alt');
      if (alt && (alt.includes('.jpg') || alt.includes('.png') || alt.includes('.gif') || alt.includes('.svg'))) {
        issues.push({
          level: 'warning',
          rule: 'WCAG_1.1.1',
          message: 'Alt text appears to be a filename rather than descriptive text',
          element: `img[${index}]`,
        });
      }

      // Check for decorative images
      if (alt === '' && !img.getAttribute('role')) {
        // This is acceptable for decorative images, but add info
        issues.push({
          level: 'info',
          rule: 'WCAG_1.1.1',
          message: 'Image has empty alt text (decorative image)',
          element: `img[${index}]`,
        });
      }
    });
  }

  /**
   * Check heading structure (WCAG 1.3.1, 2.4.6)
   */
  private static checkHeadings(document: Document, issues: AccessibilityIssue[]): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length === 0) {
      issues.push({
        level: 'warning',
        rule: 'WCAG_2.4.6',
        message: 'Page has no headings',
      });
      return;
    }

    // Check for h1
    const h1Elements = document.querySelectorAll('h1');
    if (h1Elements.length === 0) {
      issues.push({
        level: 'error',
        rule: 'WCAG_2.4.6',
        message: 'Page missing h1 heading',
      });
    } else if (h1Elements.length > 1) {
      issues.push({
        level: 'warning',
        rule: 'WCAG_2.4.6',
        message: 'Page has multiple h1 headings',
      });
    }

    // Check heading hierarchy
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (currentLevel > previousLevel + 1) {
        issues.push({
          level: 'error',
          rule: 'WCAG_1.3.1',
          message: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          element: `${heading.tagName.toLowerCase()}[${index}]`,
        });
      }

      // Check for empty headings
      if (!heading.textContent?.trim()) {
        issues.push({
          level: 'error',
          rule: 'WCAG_2.4.6',
          message: 'Empty heading found',
          element: `${heading.tagName.toLowerCase()}[${index}]`,
        });
      }

      previousLevel = currentLevel;
    });
  }

  /**
   * Check link accessibility (WCAG 2.4.4, 2.4.9)
   */
  private static checkLinks(document: Document, issues: AccessibilityIssue[]): void {
    const links = document.querySelectorAll('a[href]');
    
    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      
      // Check for empty link text
      if (!text) {
        issues.push({
          level: 'error',
          rule: 'WCAG_2.4.4',
          message: 'Link has no accessible text',
          element: `a[${index}]`,
        });
      }

      // Check for generic link text
      if (text && ['click here', 'read more', 'more', 'link'].includes(text.toLowerCase())) {
        issues.push({
          level: 'warning',
          rule: 'WCAG_2.4.4',
          message: 'Link text is not descriptive',
          element: `a[${index}]`,
        });
      }

      // Check external links
      if (href && (href.startsWith('http') || href.startsWith('//')) && link.getAttribute('target') === '_blank') {
        if (!link.getAttribute('rel')?.includes('noopener')) {
          issues.push({
            level: 'warning',
            rule: 'SECURITY',
            message: 'External link missing rel="noopener"',
            element: `a[${index}]`,
          });
        }

        // Check for indication of external link
        if (!text?.includes('(external)') && !link.querySelector('[aria-label*="external"]')) {
          issues.push({
            level: 'info',
            rule: 'WCAG_3.2.5',
            message: 'External link should indicate it opens in new window',
            element: `a[${index}]`,
          });
        }
      }
    });
  }

  /**
   * Check form accessibility (WCAG 1.3.1, 3.3.2)
   */
  private static checkForms(document: Document, issues: AccessibilityIssue[]): void {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach((input, index) => {
      const type = input.getAttribute('type');
      const id = input.getAttribute('id');
      
      // Skip hidden inputs
      if (type === 'hidden') return;

      // Check for labels
      let hasLabel = false;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        hasLabel = !!label;
      }

      // Check for aria-label or aria-labelledby
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        issues.push({
          level: 'error',
          rule: 'WCAG_1.3.1',
          message: 'Form control missing accessible label',
          element: `${input.tagName.toLowerCase()}[${index}]`,
        });
      }

      // Check required fields
      if (input.hasAttribute('required')) {
        const requiredIndicator = input.getAttribute('aria-required') === 'true' ||
                                 input.closest('form')?.querySelector(`[aria-describedby*="${id}"]`);
        
        if (!requiredIndicator) {
          issues.push({
            level: 'warning',
            rule: 'WCAG_3.3.2',
            message: 'Required field should be clearly indicated',
            element: `${input.tagName.toLowerCase()}[${index}]`,
          });
        }
      }
    });
  }

  /**
   * Check color contrast (WCAG 1.4.3, 1.4.6)
   */
  private static checkColorContrast(document: Document, issues: AccessibilityIssue[]): void {
    // This is a simplified check - in production, you'd use a proper color contrast analyzer
    const elements = document.querySelectorAll('*');
    
    elements.forEach((element, index) => {
      const computedStyle = element.getAttribute('style');
      if (computedStyle) {
        // Check for potential low contrast combinations
        if (computedStyle.includes('color: #ccc') || computedStyle.includes('color: #ddd')) {
          issues.push({
            level: 'warning',
            rule: 'WCAG_1.4.3',
            message: 'Potential low color contrast detected',
            element: `${element.tagName.toLowerCase()}[${index}]`,
          });
        }
      }
    });
  }

  /**
   * Check keyboard navigation (WCAG 2.1.1, 2.1.2)
   */
  private static checkKeyboardNavigation(document: Document, issues: AccessibilityIssue[]): void {
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]');
    
    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      
      // Check for positive tabindex (anti-pattern)
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          level: 'warning',
          rule: 'WCAG_2.4.3',
          message: 'Positive tabindex can disrupt natural tab order',
          element: `${element.tagName.toLowerCase()}[${index}]`,
        });
      }

      // Check for elements that remove from tab order unnecessarily
      if (tabIndex === '-1' && ['a', 'button'].includes(element.tagName.toLowerCase())) {
        issues.push({
          level: 'warning',
          rule: 'WCAG_2.1.1',
          message: 'Interactive element removed from keyboard navigation',
          element: `${element.tagName.toLowerCase()}[${index}]`,
        });
      }
    });
  }

  /**
   * Check ARIA landmarks (WCAG 1.3.1)
   */
  private static checkLandmarks(document: Document, issues: AccessibilityIssue[]): void {
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      issues.push({
        level: 'error',
        rule: 'WCAG_1.3.1',
        message: 'Page missing main landmark',
      });
    }

    const nav = document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      issues.push({
        level: 'info',
        rule: 'WCAG_1.3.1',
        message: 'Page missing navigation landmark',
      });
    }

    // Check for multiple main landmarks
    const mains = document.querySelectorAll('main, [role="main"]');
    if (mains.length > 1) {
      issues.push({
        level: 'error',
        rule: 'WCAG_1.3.1',
        message: 'Page has multiple main landmarks',
      });
    }
  }

  /**
   * Check language declaration (WCAG 3.1.1)
   */
  private static checkLanguage(document: Document, issues: AccessibilityIssue[]): void {
    const html = document.documentElement;
    const lang = html.getAttribute('lang');
    
    if (!lang) {
      issues.push({
        level: 'error',
        rule: 'WCAG_3.1.1',
        message: 'Page missing language declaration',
      });
    } else if (lang.length < 2) {
      issues.push({
        level: 'error',
        rule: 'WCAG_3.1.1',
        message: 'Invalid language code',
      });
    }
  }

  /**
   * Check page title (WCAG 2.4.2)
   */
  private static checkPageTitle(document: Document, issues: AccessibilityIssue[]): void {
    const title = document.querySelector('title');
    
    if (!title) {
      issues.push({
        level: 'error',
        rule: 'WCAG_2.4.2',
        message: 'Page missing title element',
      });
    } else if (!title.textContent?.trim()) {
      issues.push({
        level: 'error',
        rule: 'WCAG_2.4.2',
        message: 'Page title is empty',
      });
    } else if (title.textContent.trim().length < 3) {
      issues.push({
        level: 'warning',
        rule: 'WCAG_2.4.2',
        message: 'Page title is too short',
      });
    }
  }

  /**
   * Check skip links (WCAG 2.4.1)
   */
  private static checkSkipLinks(document: Document, issues: AccessibilityIssue[]): void {
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    const main = document.querySelector('main, [role="main"]');
    
    if (main && skipLinks.length === 0) {
      issues.push({
        level: 'warning',
        rule: 'WCAG_2.4.1',
        message: 'Page should include skip links for keyboard navigation',
      });
    }

    // Check if skip links actually work
    skipLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && href !== '#') {
        const target = document.querySelector(href);
        if (!target) {
          issues.push({
            level: 'error',
            rule: 'WCAG_2.4.1',
            message: 'Skip link target not found',
            element: `a[${index}]`,
          });
        }
      }
    });
  }
}

/**
 * Quick validation function
 */
export function validateAccessibility(html: string): AccessibilityReport {
  return AccessibilityValidator.validate(html);
}