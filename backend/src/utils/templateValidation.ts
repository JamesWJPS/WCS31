/**
 * Template validation utilities ensuring WCAG 2.2 compliance
 */

import { JSDOM } from 'jsdom';
import { Template, TemplateField } from '../models/interfaces';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AccessibilityValidationResult extends ValidationResult {
  wcagViolations: WcagViolation[];
}

export interface WcagViolation {
  rule: string;
  level: 'A' | 'AA' | 'AAA';
  description: string;
  element?: string;
}

/**
 * Validates template HTML structure for WCAG 2.2 compliance
 */
export function validateTemplateAccessibility(template: Template): AccessibilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wcagViolations: WcagViolation[] = [];

  try {
    const dom = new JSDOM(template.htmlStructure);
    const document = dom.window.document;

    // Check for proper heading structure (WCAG 2.4.6 - Level AA)
    validateHeadingStructure(document, wcagViolations);

    // Check for skip links if enabled (WCAG 2.4.1 - Level A)
    if (template.accessibilityFeatures.skipLinks) {
      validateSkipLinks(document, wcagViolations);
    }

    // Check for alt text requirements on images (WCAG 1.1.1 - Level A)
    if (template.accessibilityFeatures.altTextRequired) {
      validateImageAltText(document, wcagViolations);
    }

    // Check for proper form labels (WCAG 3.3.2 - Level A)
    validateFormLabels(document, wcagViolations);

    // Check for keyboard accessibility (WCAG 2.1.1 - Level A)
    validateKeyboardAccessibility(document, wcagViolations);

    // Check for color contrast compliance in CSS
    if (template.accessibilityFeatures.colorContrastCompliant) {
      validateColorContrast(template.cssStyles, wcagViolations);
    }

    // Check for semantic HTML structure
    validateSemanticStructure(document, wcagViolations);

  } catch (error) {
    errors.push(`Failed to parse HTML structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0 && wcagViolations.length === 0,
    errors,
    warnings,
    wcagViolations,
  };
}

/**
 * Validates proper heading hierarchy (h1, h2, h3, etc.)
 */
function validateHeadingStructure(document: Document, violations: WcagViolation[]): void {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    if (index === 0 && level !== 1) {
      violations.push({
        rule: 'WCAG 2.4.6',
        level: 'AA',
        description: 'Page should start with h1 heading',
        element: heading.tagName.toLowerCase(),
      });
    }

    if (level > previousLevel + 1) {
      violations.push({
        rule: 'WCAG 2.4.6',
        level: 'AA',
        description: `Heading level ${level} skips levels (previous was ${previousLevel})`,
        element: heading.tagName.toLowerCase(),
      });
    }

    previousLevel = level;
  });
}

/**
 * Validates presence of skip links for keyboard navigation
 */
function validateSkipLinks(document: Document, violations: WcagViolation[]): void {
  const skipLinks = document.querySelectorAll('a[href^="#"]');
  const hasSkipToMain = Array.from(skipLinks).some(link => 
    link.textContent?.toLowerCase().includes('skip to main') ||
    link.textContent?.toLowerCase().includes('skip to content')
  );

  if (!hasSkipToMain) {
    violations.push({
      rule: 'WCAG 2.4.1',
      level: 'A',
      description: 'Template should include skip links for keyboard navigation',
    });
  }
}

/**
 * Validates that images have appropriate alt text
 */
function validateImageAltText(document: Document, violations: WcagViolation[]): void {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      violations.push({
        rule: 'WCAG 1.1.1',
        level: 'A',
        description: 'All images must have alt attributes',
        element: 'img',
      });
    }
  });
}

/**
 * Validates that form inputs have proper labels
 */
function validateFormLabels(document: Document, violations: WcagViolation[]): void {
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (!label && !ariaLabel && !ariaLabelledBy) {
        violations.push({
          rule: 'WCAG 3.3.2',
          level: 'A',
          description: 'Form inputs must have associated labels',
          element: input.tagName.toLowerCase(),
        });
      }
    } else if (!ariaLabel && !ariaLabelledBy) {
      violations.push({
        rule: 'WCAG 3.3.2',
        level: 'A',
        description: 'Form inputs must have labels or aria-label attributes',
        element: input.tagName.toLowerCase(),
      });
    }
  });
}

/**
 * Validates keyboard accessibility requirements
 */
function validateKeyboardAccessibility(document: Document, violations: WcagViolation[]): void {
  const interactiveElements = document.querySelectorAll('button, a, input, textarea, select');
  
  interactiveElements.forEach(element => {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex && parseInt(tabIndex) < -1) {
      violations.push({
        rule: 'WCAG 2.1.1',
        level: 'A',
        description: 'Interactive elements should not have negative tabindex values (except -1)',
        element: element.tagName.toLowerCase(),
      });
    }
  });
}

/**
 * Validates color contrast in CSS (basic check for common patterns)
 */
function validateColorContrast(cssStyles: string, violations: WcagViolation[]): void {
  // This is a simplified check - in a real implementation, you'd want
  // to use a proper color contrast calculation library
  const lowContrastPatterns = [
    /#fff.*#f0f0f0/i,
    /#000.*#333/i,
    /rgb\(255,\s*255,\s*255\).*rgb\(240,\s*240,\s*240\)/i,
  ];

  lowContrastPatterns.forEach(pattern => {
    if (pattern.test(cssStyles)) {
      violations.push({
        rule: 'WCAG 1.4.3',
        level: 'AA',
        description: 'Color contrast may not meet WCAG AA standards (4.5:1 ratio)',
      });
    }
  });
}

/**
 * Validates semantic HTML structure
 */
function validateSemanticStructure(document: Document, violations: WcagViolation[]): void {
  const hasMain = document.querySelector('main');

  if (!hasMain) {
    violations.push({
      rule: 'WCAG 1.3.1',
      level: 'A',
      description: 'Template should include a main landmark element',
    });
  }

  // Check for proper list structure
  const lists = document.querySelectorAll('ul, ol');
  lists.forEach(list => {
    const directChildren = Array.from(list.children);
    const hasNonListItems = directChildren.some(child => child.tagName !== 'LI');
    
    if (hasNonListItems) {
      violations.push({
        rule: 'WCAG 1.3.1',
        level: 'A',
        description: 'Lists should only contain li elements as direct children',
        element: list.tagName.toLowerCase(),
      });
    }
  });
}

/**
 * Validates template field definitions
 */
export function validateTemplateFields(fields: TemplateField[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate field IDs
  const fieldIds = fields.map(field => field.id);
  const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate field IDs found: ${duplicateIds.join(', ')}`);
  }

  // Check for duplicate field names
  const fieldNames = fields.map(field => field.name);
  const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  
  if (duplicateNames.length > 0) {
    errors.push(`Duplicate field names found: ${duplicateNames.join(', ')}`);
  }

  // Validate individual fields
  fields.forEach((field, index) => {
    if (!field.id || field.id.trim() === '') {
      errors.push(`Field at index ${index} must have a valid ID`);
    }

    if (!field.name || field.name.trim() === '') {
      errors.push(`Field at index ${index} must have a valid name`);
    }

    // Validate field type-specific requirements
    switch (field.type) {
      case 'image':
        if (field.validation && !field.validation['altTextRequired']) {
          warnings.push(`Image field "${field.name}" should require alt text for accessibility`);
        }
        break;
      case 'link':
        if (field.validation && !field.validation['titleRequired']) {
          warnings.push(`Link field "${field.name}" should require title attribute for accessibility`);
        }
        break;
      case 'rich-text':
        if (field.validation && !field.validation['headingStructure']) {
          warnings.push(`Rich text field "${field.name}" should validate heading structure`);
        }
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates complete template for all compliance requirements
 */
export function validateTemplate(template: Template): AccessibilityValidationResult {
  const accessibilityResult = validateTemplateAccessibility(template);
  const fieldsResult = validateTemplateFields(template.contentFields);

  return {
    isValid: accessibilityResult.isValid && fieldsResult.isValid,
    errors: [...accessibilityResult.errors, ...fieldsResult.errors],
    warnings: [...accessibilityResult.warnings, ...fieldsResult.warnings],
    wcagViolations: accessibilityResult.wcagViolations,
  };
}