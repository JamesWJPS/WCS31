describe('User Role Permission Workflows', () => {
  beforeEach(() => {
    cy.seedDatabase();
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  describe('Administrator Role', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should have full system access', () => {
      // Test Requirement 1.1: Administrator access to all functions
      cy.visit('/dashboard');
      
      // Verify all navigation items are accessible
      cy.get('[data-testid="nav-dashboard"]').should('be.visible');
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.get('[data-testid="nav-users"]').should('be.visible');
      cy.get('[data-testid="nav-admin"]').should('be.visible');
      
      // Test user management access
      cy.visit('/users');
      cy.get('[data-testid="create-user-button"]').should('be.visible');
      cy.get('[data-testid="user-list"]').should('be.visible');
      
      // Test admin panel access
      cy.visit('/admin');
      cy.get('[data-testid="system-monitoring"]').should('be.visible');
      cy.get('[data-testid="data-integrity"]').should('be.visible');

      cy.checkA11y();
      cy.measurePerformance('admin-dashboard');
    });

    it('should create and manage user accounts', () => {
      // Test Requirement 1.2: User account management
      cy.visit('/users');
      
      // Create new editor user
      cy.get('[data-testid="create-user-button"]').click();
      cy.get('[data-testid="username-input"]').type('test-editor');
      cy.get('[data-testid="email-input"]').type('test-editor@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="role-select"]').select('editor');
      
      cy.get('[data-testid="save-user-button"]').click();
      
      // Verify user is created
      cy.get('[data-testid="success-message"]')
        .should('contain', 'User created successfully');
      
      cy.get('[data-testid="user-list"]')
        .should('contain', 'test-editor')
        .and('contain', 'editor');

      cy.checkA11y();
    });

    it('should modify user permissions', () => {
      // Test Requirement 1.3: Permission modification
      cy.visit('/users');
      
      // Find existing editor user and edit
      cy.get('[data-testid="user-item"]')
        .contains('editor')
        .find('[data-testid="edit-user-button"]')
        .click();
      
      // Change role to read-only
      cy.get('[data-testid="role-select"]').select('read-only');
      cy.get('[data-testid="save-user-button"]').click();
      
      // Verify role change
      cy.get('[data-testid="success-message"]')
        .should('contain', 'User updated successfully');
      
      cy.get('[data-testid="user-list"]')
        .should('contain', 'read-only');

      cy.checkA11y();
    });

    it('should deactivate user accounts', () => {
      // Test Requirement 1.4: User deactivation
      cy.visit('/users');
      
      // Deactivate a user
      cy.get('[data-testid="user-item"]')
        .first()
        .find('[data-testid="deactivate-user-button"]')
        .click();
      
      // Confirm deactivation
      cy.get('[data-testid="confirm-deactivation"]').click();
      
      // Verify user is deactivated
      cy.get('[data-testid="success-message"]')
        .should('contain', 'User deactivated successfully');
      
      cy.get('[data-testid="user-status"]')
        .should('contain', 'Inactive');

      cy.checkA11y();
    });
  });

  describe('Editor Role', () => {
    beforeEach(() => {
      cy.loginAsEditor();
    });

    it('should have content editing access', () => {
      // Test Requirement 2.1: Editor access to content editing
      cy.visit('/dashboard');
      
      // Verify limited navigation access
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.shouldNotHaveAccess('[data-testid="nav-users"]');
      cy.shouldNotHaveAccess('[data-testid="nav-admin"]');
      
      // Test content management access
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').should('be.visible');
      cy.get('[data-testid="content-list"]').should('be.visible');

      cy.checkA11y();
    });

    it('should create and edit content', () => {
      // Test Requirement 2.2: Content creation and editing
      cy.visit('/content');
      
      // Create new content
      cy.get('[data-testid="create-content-button"]').click();
      cy.get('[data-testid="content-title"]').type('Editor Test Content');
      cy.get('[data-testid="content-editor"]').type('This content was created by an editor.');
      
      cy.get('[data-testid="save-content-button"]').click();
      
      // Verify content is created
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Content created successfully');
      
      // Edit the content
      cy.get('[data-testid="content-item"]')
        .contains('Editor Test Content')
        .click();
      
      cy.get('[data-testid="edit-content-button"]').click();
      cy.get('[data-testid="content-title"]').clear().type('Updated Editor Content');
      cy.get('[data-testid="save-content-button"]').click();
      
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Content updated successfully');

      cy.checkA11y();
    });

    it('should not access administrative functions', () => {
      // Test Requirement 2.5: Editor access restrictions
      // Try to access user management directly
      cy.request({
        method: 'GET',
        url: '/users',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
      
      // Try to access admin panel directly
      cy.request({
        method: 'GET',
        url: '/admin',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });

      cy.checkA11y();
    });

    it('should manage documents within permissions', () => {
      // Test document management for editors
      cy.visit('/documents');
      
      // Should be able to create folders
      cy.get('[data-testid="create-folder-button"]').should('be.visible');
      
      // Should be able to upload documents
      cy.get('[data-testid="upload-document-button"]').should('be.visible');
      
      // Create a folder
      cy.get('[data-testid="create-folder-button"]').click();
      cy.get('[data-testid="folder-name-input"]').type('Editor Test Folder');
      cy.get('[data-testid="save-folder-button"]').click();
      
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Folder created successfully');

      cy.checkA11y();
    });
  });

  describe('Read-Only Role', () => {
    beforeEach(() => {
      cy.loginAsReadOnly();
    });

    it('should have view-only access', () => {
      // Test Requirement 8.1: Read-only user access
      cy.visit('/dashboard');
      
      // Verify limited navigation access
      cy.get('[data-testid="nav-content"]').should('be.visible');
      cy.get('[data-testid="nav-documents"]').should('be.visible');
      cy.shouldNotHaveAccess('[data-testid="nav-users"]');
      cy.shouldNotHaveAccess('[data-testid="nav-admin"]');

      cy.checkA11y();
    });

    it('should view content but not edit', () => {
      // Test Requirement 8.2: Read-only content access
      cy.visit('/content');
      
      // Should see content list
      cy.get('[data-testid="content-list"]').should('be.visible');
      
      // Should not see create button
      cy.shouldNotHaveAccess('[data-testid="create-content-button"]');
      
      // Click on content item
      cy.get('[data-testid="content-item"]').first().click();
      
      // Should not see edit button
      cy.shouldNotHaveAccess('[data-testid="edit-content-button"]');
      
      // Should see content in read-only mode
      cy.get('[data-testid="content-view"]').should('be.visible');

      cy.checkA11y();
    });

    it('should view documents but not upload', () => {
      // Test Requirement 8.3: Read-only document access
      cy.visit('/documents');
      
      // Should see document list
      cy.get('[data-testid="document-list"]').should('be.visible');
      
      // Should not see upload or create buttons
      cy.shouldNotHaveAccess('[data-testid="upload-document-button"]');
      cy.shouldNotHaveAccess('[data-testid="create-folder-button"]');
      
      // Should be able to download public documents
      cy.get('[data-testid="public-document"]').first().click();
      cy.get('[data-testid="download-button"]').should('be.visible');

      cy.checkA11y();
    });

    it('should receive appropriate feedback for unauthorized actions', () => {
      // Test Requirement 8.4: Clear feedback for access limitations
      cy.visit('/content');
      
      // Try to access create content via API
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/content`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`
        },
        body: {
          title: 'Unauthorized Content',
          body: 'This should fail'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
        expect(response.body.error.message).to.contain('Insufficient permissions');
      });

      cy.checkA11y();
    });
  });

  describe('Cross-Role Interactions', () => {
    it('should handle role changes correctly', () => {
      // Login as admin and change user role
      cy.loginAsAdmin();
      cy.visit('/users');
      
      // Change editor to read-only
      cy.get('[data-testid="user-item"]')
        .contains('editor')
        .find('[data-testid="edit-user-button"]')
        .click();
      
      cy.get('[data-testid="role-select"]').select('read-only');
      cy.get('[data-testid="save-user-button"]').click();
      
      // Login as the changed user
      cy.login('editor', 'editor123', 'read-only');
      cy.visit('/content');
      
      // Verify new permissions are applied
      cy.shouldNotHaveAccess('[data-testid="create-content-button"]');

      cy.checkA11y();
    });

    it('should maintain security across role boundaries', () => {
      // Test that users cannot escalate privileges
      cy.loginAsEditor();
      
      // Try to access admin API endpoints
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/admin/users`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
      
      // Try to modify own role
      cy.request({
        method: 'PUT',
        url: `${Cypress.env('apiUrl')}/users/self`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`
        },
        body: {
          role: 'administrator'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });

      cy.checkA11y();
    });
  });

  describe('Session Management', () => {
    it('should handle token expiration correctly', () => {
      cy.loginAsEditor();
      cy.visit('/content');
      
      // Simulate token expiration by clearing it
      cy.window().then((win) => {
        win.localStorage.removeItem('auth_token');
      });
      
      // Try to perform an action
      cy.get('[data-testid="create-content-button"]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Should show appropriate message
      cy.get('[data-testid="session-expired-message"]')
        .should('be.visible')
        .and('contain', 'Session expired');

      cy.checkA11y();
    });

    it('should handle concurrent sessions', () => {
      // Login in first session
      cy.loginAsEditor();
      cy.visit('/content');
      
      // Simulate login from another device (invalidate current session)
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: {
          username: 'editor',
          password: 'editor123'
        }
      });
      
      // Try to perform action with old session
      cy.get('[data-testid="create-content-button"]').click();
      
      // Should handle gracefully
      cy.get('[data-testid="session-invalid-message"]')
        .should('be.visible');

      cy.checkA11y();
    });
  });
});