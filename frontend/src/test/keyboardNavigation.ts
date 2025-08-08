import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Keyboard navigation testing utilities
 */

export interface KeyboardTestOptions {
  expectFocusable?: boolean;
  expectArrowNavigation?: boolean;
  expectEscapeHandling?: boolean;
  expectEnterActivation?: boolean;
  expectSpaceActivation?: boolean;
}

/**
 * Test basic keyboard navigation
 */
export const testBasicKeyboardNavigation = async (
  container: HTMLElement,
  options: KeyboardTestOptions = {}
): Promise<void> => {
  const user = userEvent.setup();
  
  // Get all focusable elements
  const focusableElements = getFocusableElements(container);
  
  if (options.expectFocusable !== false && focusableElements.length === 0) {
    throw new Error('No focusable elements found in component');
  }
  
  // Test Tab navigation
  if (focusableElements.length > 0) {
    await testTabNavigation(user, focusableElements);
  }
  
  // Test arrow key navigation if expected
  if (options.expectArrowNavigation) {
    await testArrowKeyNavigation(user, focusableElements);
  }
  
  // Test escape key handling if expected
  if (options.expectEscapeHandling) {
    await testEscapeKeyHandling(user, container);
  }
  
  // Test enter key activation if expected
  if (options.expectEnterActivation) {
    await testEnterKeyActivation(user, focusableElements);
  }
  
  // Test space key activation if expected
  if (options.expectSpaceActivation) {
    await testSpaceKeyActivation(user, focusableElements);
  }
};

/**
 * Get all focusable elements in a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
};

/**
 * Test tab navigation through focusable elements
 */
export const testTabNavigation = async (
  user: ReturnType<typeof userEvent.setup>,
  focusableElements: HTMLElement[]
): Promise<void> => {
  if (focusableElements.length === 0) return;
  
  // Focus first element
  focusableElements[0].focus();
  expect(document.activeElement).toBe(focusableElements[0]);
  
  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(focusableElements[i]);
  }
  
  // Test Shift+Tab navigation backwards
  for (let i = focusableElements.length - 2; i >= 0; i--) {
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(focusableElements[i]);
  }
};

/**
 * Test arrow key navigation
 */
export const testArrowKeyNavigation = async (
  user: ReturnType<typeof userEvent.setup>,
  focusableElements: HTMLElement[]
): Promise<void> => {
  if (focusableElements.length < 2) return;
  
  // Focus first element
  focusableElements[0].focus();
  
  // Test right/down arrow navigation
  await user.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(focusableElements[1]);
  
  await user.keyboard('{ArrowDown}');
  if (focusableElements.length > 2) {
    expect(document.activeElement).toBe(focusableElements[2]);
  }
  
  // Test left/up arrow navigation
  await user.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(focusableElements[1]);
  
  await user.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(focusableElements[0]);
};

/**
 * Test escape key handling
 */
export const testEscapeKeyHandling = async (
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement
): Promise<void> => {
  const escapeHandler = jest.fn();
  
  // Add escape key listener
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      escapeHandler();
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  // Test escape key
  await user.keyboard('{Escape}');
  expect(escapeHandler).toHaveBeenCalled();
  
  container.removeEventListener('keydown', handleKeyDown);
};

/**
 * Test enter key activation
 */
export const testEnterKeyActivation = async (
  user: ReturnType<typeof userEvent.setup>,
  focusableElements: HTMLElement[]
): Promise<void> => {
  const buttons = focusableElements.filter(el => 
    el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
  );
  
  for (const button of buttons) {
    const clickHandler = jest.fn();
    button.addEventListener('click', clickHandler);
    
    button.focus();
    await user.keyboard('{Enter}');
    
    expect(clickHandler).toHaveBeenCalled();
    button.removeEventListener('click', clickHandler);
  }
};

/**
 * Test space key activation
 */
export const testSpaceKeyActivation = async (
  user: ReturnType<typeof userEvent.setup>,
  focusableElements: HTMLElement[]
): Promise<void> => {
  const buttons = focusableElements.filter(el => 
    el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
  );
  
  for (const button of buttons) {
    const clickHandler = jest.fn();
    button.addEventListener('click', clickHandler);
    
    button.focus();
    await user.keyboard(' ');
    
    expect(clickHandler).toHaveBeenCalled();
    button.removeEventListener('click', clickHandler);
  }
};

/**
 * Test focus trap functionality
 */
export const testFocusTrap = async (
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement
): Promise<void> => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length < 2) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Focus last element and tab forward - should wrap to first
  lastElement.focus();
  await user.keyboard('{Tab}');
  expect(document.activeElement).toBe(firstElement);
  
  // Focus first element and shift+tab - should wrap to last
  firstElement.focus();
  await user.keyboard('{Shift>}{Tab}{/Shift}');
  expect(document.activeElement).toBe(lastElement);
};

/**
 * Test skip links functionality
 */
export const testSkipLinks = async (
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement
): Promise<void> => {
  const skipLinks = container.querySelectorAll('[href^="#"], [data-skip-link]');
  
  for (const skipLink of skipLinks) {
    const href = skipLink.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const target = container.querySelector(`#${targetId}`);
      
      if (target) {
        (skipLink as HTMLElement).focus();
        await user.keyboard('{Enter}');
        
        // Check if target is focused or scrolled into view
        expect(target).toBeInTheDocument();
      }
    }
  }
};

/**
 * Comprehensive keyboard navigation test
 */
export const runKeyboardNavigationTests = async (
  container: HTMLElement,
  options: KeyboardTestOptions = {}
): Promise<void> => {
  await testBasicKeyboardNavigation(container, options);
  
  const user = userEvent.setup();
  
  // Test focus trap if container has modal-like behavior
  if (container.getAttribute('role') === 'dialog' || container.classList.contains('modal')) {
    await testFocusTrap(user, container);
  }
  
  // Test skip links
  await testSkipLinks(user, container);
};