/**
 * Screen reader compatibility testing utilities
 */

export interface ScreenReaderTestOptions {
  expectAriaLabels?: boolean;
  expectLandmarks?: boolean;
  expectHeadingStructure?: boolean;
  expectLiveRegions?: boolean;
  expectFormLabels?: boolean;
}

/**
 * Test screen reader compatibility
 */
export const testScreenReaderCompatibility = (
  container: HTMLElement,
  options: ScreenReaderTestOptions = {}
): void => {
  // Test ARIA labels and descriptions
  if (options.expectAriaLabels !== false) {
    testAriaLabelsAndDescriptions(container);
  }
  
  // Test landmark roles
  if (options.expectLandmarks !== false) {
    testLandmarkRoles(container);
  }
  
  // Test heading structure
  if (options.expectHeadingStructure !== false) {
    testHeadingStructure(container);
  }
  
  // Test live regions
  if (options.expectLiveRegions) {
    testLiveRegions(container);
  }
  
  // Test form labels
  if (options.expectFormLabels !== false) {
    testFormLabels(container);
  }
  
  // Test interactive element accessibility
  testInteractiveElementAccessibility(container);
  
  // Test image accessibility
  testImageAccessibility(container);
  
  // Test table accessibility
  testTableAccessibility(container);
};

/**
 * Test ARIA labels and descriptions
 */
export const testAriaLabelsAndDescriptions = (container: HTMLElement): void => {
  // Check for proper ARIA labeling
  const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
  const elementsWithAriaLabelledBy = container.querySelectorAll('[aria-labelledby]');
  const elementsWithAriaDescribedBy = container.querySelectorAll('[aria-describedby]');
  
  // Verify aria-labelledby references exist
  elementsWithAriaLabelledBy.forEach((element) => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelIds = labelledBy.split(' ');
      labelIds.forEach((id) => {
        const labelElement = container.querySelector(`#${id}`);
        expect(labelElement).toBeInTheDocument();
      });
    }
  });
  
  // Verify aria-describedby references exist
  elementsWithAriaDescribedBy.forEach((element) => {
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const descriptionIds = describedBy.split(' ');
      descriptionIds.forEach((id) => {
        const descriptionElement = container.querySelector(`#${id}`);
        expect(descriptionElement).toBeInTheDocument();
      });
    }
  });
};

/**
 * Test landmark roles
 */
export const testLandmarkRoles = (container: HTMLElement): void => {
  const landmarks = [
    'banner', 'navigation', 'main', 'complementary', 
    'contentinfo', 'search', 'form', 'region'
  ];
  
  const landmarkElements = container.querySelectorAll(
    landmarks.map(role => `[role="${role}"]`).join(', ') + 
    ', header, nav, main, aside, footer, section'
  );
  
  // Check that landmark elements have appropriate labels when needed
  landmarkElements.forEach((element) => {
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    
    // Multiple landmarks of the same type should have distinguishing labels
    const sameTypeLandmarks = container.querySelectorAll(
      `[role="${role}"], ${role}`
    );
    
    if (sameTypeLandmarks.length > 1) {
      const hasLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      (element as HTMLElement).textContent?.trim();
      
      expect(hasLabel).toBeTruthy();
    }
  });
};

/**
 * Test heading structure
 */
export const testHeadingStructure = (container: HTMLElement): void => {
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
  const headingLevels: number[] = [];
  
  headings.forEach((heading) => {
    let level: number;
    
    if (heading.getAttribute('role') === 'heading') {
      const ariaLevel = heading.getAttribute('aria-level');
      level = ariaLevel ? parseInt(ariaLevel) : 1;
    } else {
      level = parseInt(heading.tagName.charAt(1));
    }
    
    headingLevels.push(level);
    
    // Check that heading has text content
    const textContent = (heading as HTMLElement).textContent?.trim();
    expect(textContent).toBeTruthy();
  });
  
  // Check that heading levels don't skip (e.g., h1 -> h3)
  for (let i = 1; i < headingLevels.length; i++) {
    const currentLevel = headingLevels[i];
    const previousLevel = headingLevels[i - 1];
    
    if (currentLevel > previousLevel) {
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
  }
  
  // Check that there's at least one h1 or equivalent
  const hasMainHeading = headingLevels.includes(1);
  if (headingLevels.length > 0) {
    expect(hasMainHeading).toBe(true);
  }
};

/**
 * Test live regions
 */
export const testLiveRegions = (container: HTMLElement): void => {
  const liveRegions = container.querySelectorAll('[aria-live]');
  
  liveRegions.forEach((region) => {
    const ariaLive = region.getAttribute('aria-live');
    expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    
    // Check for aria-atomic if needed
    const ariaAtomic = region.getAttribute('aria-atomic');
    if (ariaAtomic) {
      expect(['true', 'false']).toContain(ariaAtomic);
    }
  });
  
  // Check for status and alert roles
  const statusElements = container.querySelectorAll('[role="status"], [role="alert"]');
  statusElements.forEach((element) => {
    // Status and alert roles have implicit aria-live values
    const role = element.getAttribute('role');
    expect(['status', 'alert']).toContain(role);
  });
};

/**
 * Test form labels
 */
export const testFormLabels = (container: HTMLElement): void => {
  const formControls = container.querySelectorAll(
    'input:not([type="hidden"]), select, textarea'
  );
  
  formControls.forEach((control) => {
    const id = control.getAttribute('id');
    const ariaLabel = control.getAttribute('aria-label');
    const ariaLabelledBy = control.getAttribute('aria-labelledby');
    
    // Check for associated label
    let hasLabel = false;
    
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`);
      hasLabel = !!label;
    }
    
    // Check for aria-label or aria-labelledby
    if (!hasLabel) {
      hasLabel = !!(ariaLabel || ariaLabelledBy);
    }
    
    // Check for placeholder (less preferred but acceptable)
    if (!hasLabel && control.tagName === 'INPUT') {
      const placeholder = control.getAttribute('placeholder');
      hasLabel = !!placeholder;
    }
    
    expect(hasLabel).toBe(true);
  });
  
  // Test fieldsets and legends
  const fieldsets = container.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    const legend = fieldset.querySelector('legend');
    expect(legend).toBeInTheDocument();
  });
};

/**
 * Test interactive element accessibility
 */
export const testInteractiveElementAccessibility = (container: HTMLElement): void => {
  const interactiveElements = container.querySelectorAll(
    'button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex]'
  );
  
  interactiveElements.forEach((element) => {
    // Check for accessible name
    const accessibleName = getAccessibleName(element as HTMLElement);
    expect(accessibleName).toBeTruthy();
    
    // Check for proper role
    const role = element.getAttribute('role') || getImplicitRole(element as HTMLElement);
    expect(role).toBeTruthy();
    
    // Check for keyboard accessibility
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') {
      // Element should not be in tab order but might be programmatically focusable
    } else {
      // Element should be keyboard accessible
      expect(element).not.toHaveAttribute('tabindex', '-1');
    }
  });
};

/**
 * Test image accessibility
 */
export const testImageAccessibility = (container: HTMLElement): void => {
  const images = container.querySelectorAll('img');
  
  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    const ariaLabel = img.getAttribute('aria-label');
    const ariaLabelledBy = img.getAttribute('aria-labelledby');
    const role = img.getAttribute('role');
    
    // Decorative images should have empty alt or role="presentation"
    if (role === 'presentation' || role === 'none') {
      // Decorative image - no alt text needed
    } else {
      // Informative image - should have alt text or aria-label
      const hasAccessibleName = alt !== null || ariaLabel || ariaLabelledBy;
      expect(hasAccessibleName).toBe(true);
    }
  });
};

/**
 * Test table accessibility
 */
export const testTableAccessibility = (container: HTMLElement): void => {
  const tables = container.querySelectorAll('table');
  
  tables.forEach((table) => {
    // Check for table caption or aria-label
    const caption = table.querySelector('caption');
    const ariaLabel = table.getAttribute('aria-label');
    const ariaLabelledBy = table.getAttribute('aria-labelledby');
    
    const hasAccessibleName = caption || ariaLabel || ariaLabelledBy;
    expect(hasAccessibleName).toBeTruthy();
    
    // Check for proper header structure
    const headers = table.querySelectorAll('th');
    if (headers.length > 0) {
      headers.forEach((header) => {
        const scope = header.getAttribute('scope');
        if (scope) {
          expect(['col', 'row', 'colgroup', 'rowgroup']).toContain(scope);
        }
      });
    }
  });
};

/**
 * Get accessible name for an element
 */
export const getAccessibleName = (element: HTMLElement): string => {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelIds = ariaLabelledBy.split(' ');
    const labelTexts = labelIds.map(id => {
      const labelElement = document.getElementById(id);
      return labelElement?.textContent?.trim() || '';
    });
    return labelTexts.join(' ');
  }
  
  // Check associated label
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  
  // Check text content
  const textContent = element.textContent?.trim();
  if (textContent) return textContent;
  
  // Check placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder;
  
  // Check title
  const title = element.getAttribute('title');
  if (title) return title;
  
  return '';
};

/**
 * Get implicit role for an element
 */
export const getImplicitRole = (element: HTMLElement): string => {
  const tagName = element.tagName.toLowerCase();
  
  const roleMap: Record<string, string> = {
    'button': 'button',
    'a': element.hasAttribute('href') ? 'link' : '',
    'input': getInputRole(element as HTMLInputElement),
    'select': 'combobox',
    'textarea': 'textbox',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading',
    'img': 'img',
    'table': 'table',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'section': 'region'
  };
  
  return roleMap[tagName] || '';
};

/**
 * Get role for input element based on type
 */
export const getInputRole = (input: HTMLInputElement): string => {
  const type = input.type.toLowerCase();
  
  const inputRoleMap: Record<string, string> = {
    'button': 'button',
    'submit': 'button',
    'reset': 'button',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'range': 'slider',
    'text': 'textbox',
    'email': 'textbox',
    'password': 'textbox',
    'search': 'searchbox',
    'tel': 'textbox',
    'url': 'textbox'
  };
  
  return inputRoleMap[type] || 'textbox';
};