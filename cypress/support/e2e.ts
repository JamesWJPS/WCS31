/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import './commands';

// Import Cypress plugins
import 'cypress-axe';
import 'cypress-visual-regression/dist/support';
import 'cypress-real-events/support';
import '@testing-library/cypress/add-commands';

// Add global before hook for accessibility testing
beforeEach(() => {
  cy.injectAxe();
});

// Add global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that are expected in our application
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Performance measurement utilities
declare global {
  interface Window {
    performance: Performance;
  }
}

// Custom viewport sizes for responsive testing
Cypress.Commands.add('setViewport', (size: 'mobile' | 'tablet' | 'desktop') => {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
  };
  
  const viewport = viewports[size];
  cy.viewport(viewport.width, viewport.height);
});

// Database seeding for tests
Cypress.Commands.add('seedDatabase', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/test/seed`,
    headers: {
      'Authorization': `Bearer ${Cypress.env('adminToken')}`
    }
  });
});

// Clean up test data
Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('apiUrl')}/test/cleanup`,
    headers: {
      'Authorization': `Bearer ${Cypress.env('adminToken')}`
    }
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      setViewport(size: 'mobile' | 'tablet' | 'desktop'): Chainable<Element>;
      seedDatabase(): Chainable<Element>;
      cleanupTestData(): Chainable<Element>;
    }
  }
}