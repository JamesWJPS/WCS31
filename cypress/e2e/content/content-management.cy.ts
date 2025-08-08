describe('Content Management Workflows', () => {
  beforeEach(() => {
    cy.loginAsEditor();
    cy.visit('/content');
  });

  afterEach(() => {
    // Clean up created content
    cy.window().then((win) => {
      const createdIds = win.localStorage.getItem('test_content_ids');
      if (createdIds) {
        JSON.parse(createdIds).forEach((id: string) => {
          cy.deleteContent(id);
        });
        win.localStorage.removeItem('test_content_ids');
      }
    });
  });

  describe('Content Creation', () => {
    it('should create new content with template', () => {
      // Test Requirement 2.2: Content creation with template
      cy.get('[data-testid="create-content-button"]').click();
      
      // Select template
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-news"]').click();
      
      // Fill content form
      cy.get('[data-testid="content-title"]').type('Test News Article');
      cy.get('[data-testid="content-editor"]').type('This is a test news article content.');
      
      // Save content
      cy.get('[data-testid="save-content-button"]').click();
      
      // Verify success message
      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Content created successfully');
      
      // Verify content appears in list
      cy.get('[data-testid="content-list"]')
        .should('contain', 'Test News Article');

      // Store ID for cleanup
      cy.get('[data-testid="content-item"]')
        .first()
        .invoke('attr', 'data-content-id')
        .then((id) => {
          cy.window().then((win) => {
            const ids = JSON.parse(win.localStorage.getItem('test_content_ids') || '[]');
            ids.push(id);
            win.localStorage.setItem('test_content_ids', JSON.stringify(ids));
          });
        });

      cy.checkA11y();
      cy.measurePerformance('content-creation');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="create-content-button"]').click();
      cy.get('[data-testid="save-content-button"]').click();
      
      // Verify validation errors
      cy.get('[data-testid="title-error"]')
        .should('be.visible')
        .and('contain', 'Title is required');
      
      cy.get('[data-testid="content-error"]')
        .should('be.visible')
        .and('contain', 'Content is required');

      cy.checkA11y();
    });

    it('should preview content before publishing', () => {
      // Test Requirement 2.3: Content preview
      cy.get('[data-testid="create-content-button"]').click();
      
      cy.get('[data-testid="content-title"]').type('Preview Test');
      cy.get('[data-testid="content-editor"]').type('Preview content');
      
      // Open preview
      cy.get('[data-testid="preview-button"]').click();
      
      // Verify preview modal
      cy.get('[data-testid="preview-modal"]').should('be.visible');
      cy.get('[data-testid="preview-title"]').should('contain', 'Preview Test');
      cy.get('[data-testid="preview-content"]').should('contain', 'Preview content');
      
      // Close preview
      cy.get('[data-testid="close-preview"]').click();
      cy.get('[data-testid="preview-modal"]').should('not.exist');

      cy.checkA11y();
    });
  });

  describe('Content Editing', () => {
    beforeEach(() => {
      // Create test content
      cy.createContent('Edit Test Article', 'Original content').then((content) => {
        cy.window().then((win) => {
          win.localStorage.setItem('test_content_id', content.id);
        });
      });
      cy.reload();
    });

    it('should edit existing content', () => {
      // Test Requirement 2.2: Content editing
      cy.get('[data-testid="content-item"]').first().click();
      cy.get('[data-testid="edit-content-button"]').click();
      
      // Modify content
      cy.get('[data-testid="content-title"]').clear().type('Updated Article');
      cy.get('[data-testid="content-editor"]').clear().type('Updated content');
      
      // Save changes
      cy.get('[data-testid="save-content-button"]').click();
      
      // Verify update
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Content updated successfully');
      
      cy.get('[data-testid="content-list"]')
        .should('contain', 'Updated Article');

      cy.checkA11y();
    });

    it('should handle concurrent editing', () => {
      // Simulate concurrent editing scenario
      cy.get('[data-testid="content-item"]').first().click();
      cy.get('[data-testid="edit-content-button"]').click();
      
      // Simulate another user editing (via API)
      cy.window().then((win) => {
        const contentId = win.localStorage.getItem('test_content_id');
        cy.request({
          method: 'PUT',
          url: `${Cypress.env('apiUrl')}/content/${contentId}`,
          headers: {
            'Authorization': `Bearer ${win.localStorage.getItem('auth_token')}`
          },
          body: {
            title: 'Concurrent Edit',
            body: 'Concurrent content'
          }
        });
      });
      
      // Try to save our changes
      cy.get('[data-testid="content-title"]').clear().type('My Edit');
      cy.get('[data-testid="save-content-button"]').click();
      
      // Should show conflict warning
      cy.get('[data-testid="conflict-warning"]')
        .should('be.visible')
        .and('contain', 'Content has been modified by another user');

      cy.checkA11y();
    });
  });

  describe('Content Status Management', () => {
    it('should manage content publication status', () => {
      // Test Requirement 2.3: Content status management
      cy.createContent('Status Test', 'Test content').then((content) => {
        cy.reload();
        
        cy.get(`[data-content-id="${content.id}"]`).click();
        
        // Change to draft
        cy.get('[data-testid="status-selector"]').click();
        cy.get('[data-testid="status-draft"]').click();
        cy.get('[data-testid="save-status-button"]').click();
        
        // Verify status change
        cy.get('[data-testid="content-status"]').should('contain', 'Draft');
        
        // Publish content
        cy.get('[data-testid="status-selector"]').click();
        cy.get('[data-testid="status-published"]').click();
        cy.get('[data-testid="save-status-button"]').click();
        
        cy.get('[data-testid="content-status"]').should('contain', 'Published');
      });

      cy.checkA11y();
    });
  });

  describe('Content Search and Filtering', () => {
    beforeEach(() => {
      // Create multiple test content items
      cy.createContent('News Article 1', 'News content 1');
      cy.createContent('Event Announcement', 'Event content');
      cy.createContent('News Article 2', 'News content 2');
      cy.reload();
    });

    it('should search content by title', () => {
      cy.get('[data-testid="search-input"]').type('News');
      cy.get('[data-testid="search-button"]').click();
      
      // Verify filtered results
      cy.get('[data-testid="content-item"]').should('have.length', 2);
      cy.get('[data-testid="content-list"]').should('contain', 'News Article 1');
      cy.get('[data-testid="content-list"]').should('contain', 'News Article 2');
      cy.get('[data-testid="content-list"]').should('not.contain', 'Event Announcement');

      cy.checkA11y();
    });

    it('should filter content by status', () => {
      cy.get('[data-testid="status-filter"]').click();
      cy.get('[data-testid="filter-published"]').click();
      
      // Verify only published content shown
      cy.get('[data-testid="content-item"]').each(($item) => {
        cy.wrap($item).find('[data-testid="content-status"]').should('contain', 'Published');
      });

      cy.checkA11y();
    });
  });

  describe('Template Integration', () => {
    it('should apply template styling correctly', () => {
      // Test Requirement 5.3: Template application
      cy.get('[data-testid="create-content-button"]').click();
      
      // Select specific template
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-event"]').click();
      
      // Verify template-specific fields appear
      cy.get('[data-testid="event-date-field"]').should('be.visible');
      cy.get('[data-testid="event-location-field"]').should('be.visible');
      
      // Fill template fields
      cy.get('[data-testid="content-title"]').type('Community Event');
      cy.get('[data-testid="event-date-field"]').type('2024-12-25');
      cy.get('[data-testid="event-location-field"]').type('Town Hall');
      cy.get('[data-testid="content-editor"]').type('Join us for the community event');
      
      // Preview with template
      cy.get('[data-testid="preview-button"]').click();
      
      // Verify template styling in preview
      cy.get('[data-testid="preview-modal"]').within(() => {
        cy.get('.event-template').should('exist');
        cy.get('.event-date').should('contain', '2024-12-25');
        cy.get('.event-location').should('contain', 'Town Hall');
      });

      cy.checkA11y();
    });
  });

  describe('Responsive Design', () => {
    ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
      it(`should work correctly on ${viewport}`, () => {
        cy.setViewport(viewport as 'mobile' | 'tablet' | 'desktop');
        
        // Test content creation on different viewports
        cy.get('[data-testid="create-content-button"]').click();
        cy.get('[data-testid="content-title"]').type(`${viewport} Test`);
        cy.get('[data-testid="content-editor"]').type('Responsive test content');
        
        // Verify form is usable
        cy.get('[data-testid="save-content-button"]').should('be.visible').click();
        
        cy.get('[data-testid="success-message"]').should('be.visible');

        cy.checkA11y();
        cy.compareSnapshot(`content-creation-${viewport}`);
      });
    });
  });
});