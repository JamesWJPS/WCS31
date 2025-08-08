describe('Template Visual Regression Tests', () => {
  beforeEach(() => {
    cy.loginAsEditor();
    cy.seedDatabase();
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  describe('Template Rendering Consistency', () => {
    const templates = [
      { id: 'news-template', name: 'News Article' },
      { id: 'event-template', name: 'Event Announcement' },
      { id: 'meeting-template', name: 'Meeting Minutes' },
      { id: 'policy-template', name: 'Policy Document' }
    ];

    templates.forEach((template) => {
      it(`should render ${template.name} template consistently`, () => {
        // Create content with specific template
        cy.visit('/content');
        cy.get('[data-testid="create-content-button"]').click();
        
        // Select template
        cy.get('[data-testid="template-selector"]').click();
        cy.get(`[data-testid="template-option-${template.id}"]`).click();
        
        // Fill template-specific content
        cy.get('[data-testid="content-title"]').type(`Test ${template.name}`);
        
        if (template.id === 'news-template') {
          cy.get('[data-testid="news-summary"]').type('This is a news summary');
          cy.get('[data-testid="news-body"]').type('This is the main news content with important information.');
        } else if (template.id === 'event-template') {
          cy.get('[data-testid="event-date"]').type('2024-12-25');
          cy.get('[data-testid="event-time"]').type('14:00');
          cy.get('[data-testid="event-location"]').type('Town Hall');
          cy.get('[data-testid="event-description"]').type('Join us for this community event.');
        } else if (template.id === 'meeting-template') {
          cy.get('[data-testid="meeting-date"]').type('2024-01-15');
          cy.get('[data-testid="meeting-attendees"]').type('John Smith, Jane Doe, Bob Johnson');
          cy.get('[data-testid="meeting-agenda"]').type('1. Budget Review\n2. Community Projects\n3. Next Steps');
        } else if (template.id === 'policy-template') {
          cy.get('[data-testid="policy-number"]').type('POL-2024-001');
          cy.get('[data-testid="policy-effective-date"]').type('2024-02-01');
          cy.get('[data-testid="policy-content"]').type('This policy outlines the procedures for community engagement.');
        }
        
        // Save content
        cy.get('[data-testid="save-content-button"]').click();
        
        // Wait for save confirmation
        cy.get('[data-testid="success-message"]').should('be.visible');
        
        // Preview the content
        cy.get('[data-testid="content-item"]')
          .contains(`Test ${template.name}`)
          .click();
        
        cy.get('[data-testid="preview-button"]').click();
        
        // Wait for preview to load
        cy.get('[data-testid="preview-modal"]').should('be.visible');
        
        // Take screenshot for visual regression
        cy.get('[data-testid="preview-content"]').compareSnapshot(`template-${template.id}-desktop`);
        
        // Test mobile view
        cy.setViewport('mobile');
        cy.get('[data-testid="preview-content"]').compareSnapshot(`template-${template.id}-mobile`);
        
        // Test tablet view
        cy.setViewport('tablet');
        cy.get('[data-testid="preview-content"]').compareSnapshot(`template-${template.id}-tablet`);
        
        // Reset viewport
        cy.setViewport('desktop');
        
        cy.checkA11y();
      });
    });
  });

  describe('Template Accessibility Compliance', () => {
    it('should maintain WCAG 2.2 compliance across templates', () => {
      const templates = ['news-template', 'event-template', 'meeting-template', 'policy-template'];
      
      templates.forEach((templateId) => {
        cy.visit('/content');
        cy.get('[data-testid="create-content-button"]').click();
        
        // Select template
        cy.get('[data-testid="template-selector"]').click();
        cy.get(`[data-testid="template-option-${templateId}"]`).click();
        
        // Fill minimal content
        cy.get('[data-testid="content-title"]').type(`Accessibility Test ${templateId}`);
        
        // Fill required fields based on template
        if (templateId === 'event-template') {
          cy.get('[data-testid="event-date"]').type('2024-12-25');
          cy.get('[data-testid="event-location"]').type('Town Hall');
        }
        
        cy.get('[data-testid="save-content-button"]').click();
        cy.get('[data-testid="success-message"]').should('be.visible');
        
        // Preview and test accessibility
        cy.get('[data-testid="content-item"]')
          .contains(`Accessibility Test ${templateId}`)
          .click();
        
        cy.get('[data-testid="preview-button"]').click();
        cy.get('[data-testid="preview-modal"]').should('be.visible');
        
        // Run accessibility tests
        cy.checkA11y('[data-testid="preview-content"]', {
          rules: {
            'color-contrast': { enabled: true },
            'heading-order': { enabled: true },
            'landmark-one-main': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'skip-link': { enabled: true }
          }
        });
        
        // Close preview
        cy.get('[data-testid="close-preview"]').click();
      });
    });
  });

  describe('Template Color Contrast Validation', () => {
    it('should validate color contrast ratios', () => {
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      // Select news template
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-news-template"]').click();
      
      // Fill content
      cy.get('[data-testid="content-title"]').type('Color Contrast Test');
      cy.get('[data-testid="news-summary"]').type('Testing color contrast compliance');
      cy.get('[data-testid="news-body"]').type('This content tests various color combinations for accessibility compliance.');
      
      cy.get('[data-testid="save-content-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Preview content
      cy.get('[data-testid="content-item"]')
        .contains('Color Contrast Test')
        .click();
      
      cy.get('[data-testid="preview-button"]').click();
      cy.get('[data-testid="preview-modal"]').should('be.visible');
      
      // Test color contrast programmatically
      cy.get('[data-testid="preview-content"]').within(() => {
        // Check heading contrast
        cy.get('h1').should('be.visible').then(($heading) => {
          const headingColor = $heading.css('color');
          const backgroundColor = $heading.css('background-color');
          
          // Calculate contrast ratio (simplified check)
          cy.task('log', `Heading color: ${headingColor}, Background: ${backgroundColor}`);
        });
        
        // Check body text contrast
        cy.get('p').should('be.visible').then(($paragraph) => {
          const textColor = $paragraph.css('color');
          const backgroundColor = $paragraph.css('background-color');
          
          cy.task('log', `Text color: ${textColor}, Background: ${backgroundColor}`);
        });
        
        // Check link contrast
        cy.get('a').should('be.visible').then(($link) => {
          const linkColor = $link.css('color');
          const backgroundColor = $link.css('background-color');
          
          cy.task('log', `Link color: ${linkColor}, Background: ${backgroundColor}`);
        });
      });
      
      // Run automated contrast checking
      cy.checkA11y('[data-testid="preview-content"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  describe('Template Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'large-desktop', width: 1920, height: 1080 }
    ];

    it('should render templates responsively across devices', () => {
      // Create test content
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-event-template"]').click();
      
      cy.get('[data-testid="content-title"]').type('Responsive Design Test Event');
      cy.get('[data-testid="event-date"]').type('2024-12-25');
      cy.get('[data-testid="event-time"]').type('14:00');
      cy.get('[data-testid="event-location"]').type('Community Center');
      cy.get('[data-testid="event-description"]').type('This event tests responsive design across different screen sizes and devices.');
      
      cy.get('[data-testid="save-content-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Test each viewport
      viewports.forEach((viewport) => {
        cy.viewport(viewport.width, viewport.height);
        
        // Open preview
        cy.get('[data-testid="content-item"]')
          .contains('Responsive Design Test Event')
          .click();
        
        cy.get('[data-testid="preview-button"]').click();
        cy.get('[data-testid="preview-modal"]').should('be.visible');
        
        // Wait for layout to stabilize
        cy.wait(1000);
        
        // Take screenshot
        cy.get('[data-testid="preview-content"]').compareSnapshot(`event-template-responsive-${viewport.name}`);
        
        // Verify key elements are visible and properly positioned
        cy.get('[data-testid="preview-content"]').within(() => {
          cy.get('h1').should('be.visible');
          cy.get('[data-testid="event-date-display"]').should('be.visible');
          cy.get('[data-testid="event-location-display"]').should('be.visible');
          cy.get('[data-testid="event-description-display"]').should('be.visible');
        });
        
        // Check accessibility at this viewport
        cy.checkA11y('[data-testid="preview-content"]');
        
        // Close preview for next iteration
        cy.get('[data-testid="close-preview"]').click();
      });
    });
  });

  describe('Template Print Styles', () => {
    it('should render correctly for print media', () => {
      // Create content for print testing
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-policy-template"]').click();
      
      cy.get('[data-testid="content-title"]').type('Print Style Test Policy');
      cy.get('[data-testid="policy-number"]').type('POL-2024-PRINT');
      cy.get('[data-testid="policy-effective-date"]').type('2024-01-01');
      cy.get('[data-testid="policy-content"]').type('This policy document tests print styling to ensure proper formatting when printed or saved as PDF.');
      
      cy.get('[data-testid="save-content-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Open preview
      cy.get('[data-testid="content-item"]')
        .contains('Print Style Test Policy')
        .click();
      
      cy.get('[data-testid="preview-button"]').click();
      cy.get('[data-testid="preview-modal"]').should('be.visible');
      
      // Simulate print media query
      cy.get('[data-testid="preview-content"]').invoke('attr', 'style', 'print-color-adjust: exact;');
      
      // Take screenshot with print styles
      cy.get('[data-testid="preview-content"]').compareSnapshot('policy-template-print-style');
      
      // Verify print-specific elements
      cy.get('[data-testid="preview-content"]').within(() => {
        // Check that navigation elements are hidden in print
        cy.get('[data-testid="navigation"]').should('not.be.visible');
        
        // Check that print-specific elements are visible
        cy.get('[data-testid="print-header"]').should('be.visible');
        cy.get('[data-testid="print-footer"]').should('be.visible');
      });
    });
  });

  describe('Template Dynamic Content', () => {
    it('should handle dynamic content updates correctly', () => {
      // Create content with dynamic elements
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-meeting-template"]').click();
      
      cy.get('[data-testid="content-title"]').type('Dynamic Content Test Meeting');
      cy.get('[data-testid="meeting-date"]').type('2024-01-15');
      cy.get('[data-testid="meeting-attendees"]').type('Alice, Bob, Charlie');
      cy.get('[data-testid="meeting-agenda"]').type('1. Opening\n2. Main Discussion\n3. Action Items');
      
      cy.get('[data-testid="save-content-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Open for editing
      cy.get('[data-testid="content-item"]')
        .contains('Dynamic Content Test Meeting')
        .click();
      
      cy.get('[data-testid="edit-content-button"]').click();
      
      // Add more attendees dynamically
      cy.get('[data-testid="add-attendee-button"]').click();
      cy.get('[data-testid="attendee-input"]').last().type('David');
      
      // Add agenda item
      cy.get('[data-testid="add-agenda-item-button"]').click();
      cy.get('[data-testid="agenda-item-input"]').last().type('4. Closing Remarks');
      
      // Save changes
      cy.get('[data-testid="save-content-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Preview updated content
      cy.get('[data-testid="preview-button"]').click();
      cy.get('[data-testid="preview-modal"]').should('be.visible');
      
      // Verify dynamic content is rendered correctly
      cy.get('[data-testid="preview-content"]').within(() => {
        cy.get('[data-testid="attendees-list"]').should('contain', 'David');
        cy.get('[data-testid="agenda-list"]').should('contain', '4. Closing Remarks');
      });
      
      // Take screenshot of dynamic content
      cy.get('[data-testid="preview-content"]').compareSnapshot('meeting-template-dynamic-content');
      
      cy.checkA11y('[data-testid="preview-content"]');
    });
  });

  describe('Template Error States', () => {
    it('should handle missing required fields gracefully', () => {
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      // Select template with required fields
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-event-template"]').click();
      
      // Fill only title, leave required fields empty
      cy.get('[data-testid="content-title"]').type('Incomplete Event');
      
      // Try to save
      cy.get('[data-testid="save-content-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="validation-error"]').should('be.visible');
      cy.get('[data-testid="event-date-error"]').should('contain', 'Event date is required');
      cy.get('[data-testid="event-location-error"]').should('contain', 'Event location is required');
      
      // Take screenshot of error state
      cy.get('[data-testid="content-form"]').compareSnapshot('event-template-validation-errors');
      
      cy.checkA11y();
    });

    it('should handle template loading failures', () => {
      // Simulate template loading failure
      cy.intercept('GET', '**/api/templates/*', { statusCode: 500 }).as('templateError');
      
      cy.visit('/content');
      cy.get('[data-testid="create-content-button"]').click();
      
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-news-template"]').click();
      
      cy.wait('@templateError');
      
      // Should show error message
      cy.get('[data-testid="template-error"]')
        .should('be.visible')
        .and('contain', 'Failed to load template');
      
      // Take screenshot of error state
      cy.get('[data-testid="content-form"]').compareSnapshot('template-loading-error');
      
      cy.checkA11y();
    });
  });
});