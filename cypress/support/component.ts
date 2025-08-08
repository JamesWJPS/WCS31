/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import './commands';

// Import Cypress plugins for component testing
import 'cypress-axe';
import '@testing-library/cypress/add-commands';

// Component testing specific setup
import { mount } from 'cypress/react18';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// Add global before hook for accessibility testing
beforeEach(() => {
  cy.injectAxe();
});