describe('Authentication Workflows', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Login Process', () => {
    it('should allow administrator login with full access', () => {
      // Test Requirement 1.1: Administrator access to all functions
      cy.get('[data-testid="username-input"]').type('admin');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();

      // Verify successful login
      cy.url().should('not.include', '/login');
      cy.get('[data-testid="user-menu"]').should('contain', 'admin');

      // Verify admin has access to all features
      cy.get('[data-testid="nav-users"]').should('be.visible');
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.get('[data-testid="nav-admin"]').should('be.visible');

      // Check accessibility
      cy.checkA11y();
      
      // Measure performance
      cy.measurePerformance('admin-login');
    });

    it('should allow editor login with content access', () => {
      // Test Requirement 2.1: Editor access to content editing
      cy.get('[data-testid="username-input"]').type('editor');
      cy.get('[data-testid="password-input"]').type('editor123');
      cy.get('[data-testid="login-button"]').click();

      // Verify successful login
      cy.url().should('not.include', '/login');
      cy.get('[data-testid="user-menu"]').should('contain', 'editor');

      // Verify editor has limited access
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.shouldNotHaveAccess('[data-testid="nav-users"]');
      cy.shouldNotHaveAccess('[data-testid="nav-admin"]');

      cy.checkA11y();
    });

    it('should allow read-only user login with view access', () => {
      // Test Requirement 8.1: Read-only user access
      cy.get('[data-testid="username-input"]').type('readonly');
      cy.get('[data-testid="password-input"]').type('readonly123');
      cy.get('[data-testid="login-button"]').click();

      // Verify successful login
      cy.url().should('not.include', '/login');
      cy.get('[data-testid="user-menu"]').should('contain', 'readonly');

      // Verify read-only has minimal access
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.shouldNotHaveAccess('[data-testid="nav-users"]');
      cy.shouldNotHaveAccess('[data-testid="nav-admin"]');

      cy.checkA11y();
    });

    it('should reject invalid credentials', () => {
      cy.get('[data-testid="username-input"]').type('invalid');
      cy.get('[data-testid="password-input"]').type('invalid');
      cy.get('[data-testid="login-button"]').click();

      // Verify error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');

      // Verify still on login page
      cy.url().should('include', '/login');

      cy.checkA11y();
    });

    it('should handle keyboard navigation', () => {
      // Test keyboard accessibility
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'username-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'password-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'login-button');

      cy.checkA11y();
    });
  });

  describe('Logout Process', () => {
    beforeEach(() => {
      cy.loginAsEditor();
      cy.visit('/dashboard');
    });

    it('should successfully log out user', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Verify redirect to login
      cy.url().should('include', '/login');
      
      // Verify token is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.be.null;
      });

      cy.checkA11y();
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');

      cy.visit('/content');
      cy.url().should('include', '/login');

      cy.visit('/documents');
      cy.url().should('include', '/login');
    });

    it('should maintain intended destination after login', () => {
      cy.visit('/content');
      cy.url().should('include', '/login');

      cy.loginAsEditor();
      cy.url().should('include', '/content');
    });
  });
});