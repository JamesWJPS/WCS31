/// <reference types="cypress" />
/// <reference types="cypress-axe" />
/// <reference types="cypress-visual-regression" />

// Authentication commands
Cypress.Commands.add('login', (username: string, password: string, role: 'administrator' | 'editor' | 'read-only' = 'editor') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      username,
      password
    }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('token');
    
    // Store token in localStorage
    window.localStorage.setItem('auth_token', response.body.token);
    window.localStorage.setItem('user_role', role);
    
    // Set authorization header for future requests
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', response.body.token);
    });
  });
});

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin', 'admin123', 'administrator');
});

Cypress.Commands.add('loginAsEditor', () => {
  cy.login('editor', 'editor123', 'editor');
});

Cypress.Commands.add('loginAsReadOnly', () => {
  cy.login('readonly', 'readonly123', 'read-only');
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('auth_token');
    win.localStorage.removeItem('user_role');
  });
  cy.visit('/login');
});

// Content management commands
Cypress.Commands.add('createContent', (title: string, content: string, templateId?: string) => {
  const token = window.localStorage.getItem('auth_token');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/content`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: {
      title,
      body: content,
      templateId: templateId || 'default-template',
      status: 'published'
    }
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

Cypress.Commands.add('deleteContent', (contentId: string) => {
  const token = window.localStorage.getItem('auth_token');
  
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('apiUrl')}/content/${contentId}`,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
});

// Document management commands
Cypress.Commands.add('uploadDocument', (fileName: string, folderId?: string) => {
  const token = window.localStorage.getItem('auth_token');
  
  cy.fixture(fileName, 'base64').then((fileContent) => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent);
    const formData = new FormData();
    formData.append('file', blob, fileName);
    if (folderId) {
      formData.append('folderId', folderId);
    }
    
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/documents/upload`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
  });
});

Cypress.Commands.add('createFolder', (name: string, isPublic: boolean = false, parentId?: string) => {
  const token = window.localStorage.getItem('auth_token');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/folders`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: {
      name,
      isPublic,
      parentId
    }
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

// Accessibility testing commands
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  cy.checkA11y(context, options, (violations) => {
    if (violations.length > 0) {
      cy.task('log', `${violations.length} accessibility violation(s) detected`);
      violations.forEach((violation) => {
        cy.task('log', `${violation.id}: ${violation.description}`);
        violation.nodes.forEach((node) => {
          cy.task('log', `  - ${node.target}`);
        });
      });
    }
  });
});

// Performance testing commands
Cypress.Commands.add('measurePerformance', (name: string) => {
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
    
    cy.task('log', `Performance metrics for ${name}:`);
    cy.task('log', `  Load time: ${loadTime}ms`);
    cy.task('log', `  DOM Content Loaded: ${domContentLoaded}ms`);
    
    // Assert performance thresholds
    expect(loadTime).to.be.lessThan(3000); // 3 seconds max load time
    expect(domContentLoaded).to.be.lessThan(1500); // 1.5 seconds max DOM ready
  });
});

// Visual regression testing commands
Cypress.Commands.add('compareSnapshot', (name: string, options?: any) => {
  cy.compareSnapshot(name, options);
});

// Wait for API response
Cypress.Commands.add('waitForApi', (alias: string, timeout: number = 10000) => {
  cy.wait(alias, { timeout });
});

// Custom assertions for role-based access
Cypress.Commands.add('shouldHaveAccess', (selector: string) => {
  cy.get(selector).should('be.visible').and('not.be.disabled');
});

Cypress.Commands.add('shouldNotHaveAccess', (selector: string) => {
  cy.get(selector).should('not.exist');
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string, role?: 'administrator' | 'editor' | 'read-only'): Chainable<Element>;
      loginAsAdmin(): Chainable<Element>;
      loginAsEditor(): Chainable<Element>;
      loginAsReadOnly(): Chainable<Element>;
      logout(): Chainable<Element>;
      createContent(title: string, content: string, templateId?: string): Chainable<any>;
      deleteContent(contentId: string): Chainable<Element>;
      uploadDocument(fileName: string, folderId?: string): Chainable<Element>;
      createFolder(name: string, isPublic?: boolean, parentId?: string): Chainable<any>;
      checkA11y(context?: string, options?: any): Chainable<Element>;
      measurePerformance(name: string): Chainable<Element>;
      compareSnapshot(name: string, options?: any): Chainable<Element>;
      waitForApi(alias: string, timeout?: number): Chainable<Element>;
      shouldHaveAccess(selector: string): Chainable<Element>;
      shouldNotHaveAccess(selector: string): Chainable<Element>;
    }
  }
}