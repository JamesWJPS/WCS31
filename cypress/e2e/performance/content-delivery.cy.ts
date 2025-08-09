describe('Content Delivery Performance Tests', () => {
  beforeEach(() => {
    cy.seedDatabase();
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  describe('Page Load Performance', () => {
    it('should load dashboard within performance thresholds', () => {
      cy.loginAsEditor();
      
      // Measure dashboard load time
      cy.visit('/dashboard');
      cy.measurePerformance('dashboard-load');
      
      // Verify critical elements are loaded
      cy.get('[data-testid="dashboard-content"]').should('be.visible');
      cy.get('[data-testid="nav-menu"]').should('be.visible');
      
      // Check for performance metrics
      cy.window().then((win) => {
        const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const firstContentfulPaint = win.performance.getEntriesByName('first-contentful-paint')[0];
        
        cy.task('log', `Dashboard load time: ${loadTime}ms`);
        if (firstContentfulPaint) {
          cy.task('log', `First Contentful Paint: ${firstContentfulPaint.startTime}ms`);
        }
        
        // Assert performance thresholds
        expect(loadTime).to.be.lessThan(2000); // 2 seconds max
      });
    });

    it('should load content management page efficiently', () => {
      cy.loginAsEditor();
      
      // Intercept API calls to measure response times
      cy.intercept('GET', '**/api/content*').as('getContent');
      cy.intercept('GET', '**/api/templates*').as('getTemplates');
      
      cy.visit('/content');
      
      // Wait for API calls and measure response times
      cy.wait('@getContent').then((interception) => {
        const responseTime = interception.response?.duration || 0;
        cy.task('log', `Content API response time: ${responseTime}ms`);
        expect(responseTime).to.be.lessThan(1000); // 1 second max
      });
      
      cy.wait('@getTemplates').then((interception) => {
        const responseTime = interception.response?.duration || 0;
        cy.task('log', `Templates API response time: ${responseTime}ms`);
        expect(responseTime).to.be.lessThan(500); // 500ms max
      });
      
      cy.measurePerformance('content-page-load');
    });

    it('should load document management efficiently', () => {
      cy.loginAsEditor();
      
      // Intercept document-related API calls
      cy.intercept('GET', '**/api/documents*').as('getDocuments');
      cy.intercept('GET', '**/api/folders*').as('getFolders');
      
      cy.visit('/documents');
      
      cy.wait('@getDocuments').then((interception) => {
        const responseTime = interception.response?.duration || 0;
        cy.task('log', `Documents API response time: ${responseTime}ms`);
        expect(responseTime).to.be.lessThan(1500); // 1.5 seconds max
      });
      
      cy.wait('@getFolders').then((interception) => {
        const responseTime = interception.response?.duration || 0;
        cy.task('log', `Folders API response time: ${responseTime}ms`);
        expect(responseTime).to.be.lessThan(800); // 800ms max
      });
      
      cy.measurePerformance('documents-page-load');
    });
  });

  describe('Content Rendering Performance', () => {
    it('should render large content lists efficiently', () => {
      cy.loginAsEditor();
      
      // Create multiple content items for testing
      const contentItems = Array.from({ length: 50 }, (_, i) => ({
        title: `Performance Test Content ${i + 1}`,
        body: `This is test content item ${i + 1} for performance testing.`
      }));
      
      // Create content items via API for speed
      contentItems.forEach((item, index) => {
        cy.createContent(item.title, item.body).then(() => {
          if (index === contentItems.length - 1) {
            // After all content is created, test rendering performance
            cy.visit('/content');
            
            // Measure rendering time
            const startTime = performance.now();
            cy.get('[data-testid="content-list"]').should('be.visible').then(() => {
              const endTime = performance.now();
              const renderTime = endTime - startTime;
              cy.task('log', `Content list render time: ${renderTime}ms`);
              expect(renderTime).to.be.lessThan(1000); // 1 second max
            });
            
            // Verify all items are rendered
            cy.get('[data-testid="content-item"]').should('have.length.at.least', 50);
            
            // Test scrolling performance
            cy.get('[data-testid="content-list"]').scrollTo('bottom');
            cy.get('[data-testid="content-item"]').last().should('be.visible');
          }
        });
      });
    });

    it('should handle template rendering efficiently', () => {
      cy.loginAsEditor();
      cy.visit('/content');
      
      // Test template selection performance
      cy.get('[data-testid="create-content-button"]').click();
      
      const startTime = performance.now();
      cy.get('[data-testid="template-selector"]').click().then(() => {
        const endTime = performance.now();
        const templateLoadTime = endTime - startTime;
        cy.task('log', `Template selector load time: ${templateLoadTime}ms`);
        expect(templateLoadTime).to.be.lessThan(500); // 500ms max
      });
      
      // Test template switching performance
      cy.get('[data-testid="template-option-news"]').click();
      cy.get('[data-testid="template-option-event"]').click();
      cy.get('[data-testid="template-option-meeting"]').click();
      
      // Verify template fields load quickly
      cy.get('[data-testid="meeting-date-field"]').should('be.visible');
      cy.get('[data-testid="meeting-attendees-field"]').should('be.visible');
    });
  });

  describe('File Upload Performance', () => {
    it('should handle file uploads efficiently', () => {
      cy.loginAsEditor();
      cy.visit('/documents');
      
      // Create test folder
      cy.createFolder('Performance Test Folder', true).then((folder) => {
        cy.reload();
        cy.get(`[data-folder-id="${folder.id}"]`).click();
        
        // Test single file upload performance
        const startTime = performance.now();
        
        cy.fixture('test-document.pdf', 'base64').then((fileContent) => {
          const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/pdf');
          const file = new File([blob], 'performance-test.pdf', { type: 'application/pdf' });
          
          cy.get('[data-testid="file-drop-zone"]').selectFile({
            contents: fileContent,
            fileName: 'performance-test.pdf',
            mimeType: 'application/pdf'
          }, { action: 'drag-drop' });
          
          // Wait for upload completion
          cy.get('[data-testid="upload-success"]', { timeout: 15000 }).should('be.visible').then(() => {
            const endTime = performance.now();
            const uploadTime = endTime - startTime;
            cy.task('log', `File upload time: ${uploadTime}ms`);
            expect(uploadTime).to.be.lessThan(10000); // 10 seconds max
          });
        });
      });
    });

    it('should handle multiple file uploads efficiently', () => {
      cy.loginAsEditor();
      cy.visit('/documents');
      
      cy.createFolder('Bulk Upload Test', true).then((folder) => {
        cy.reload();
        cy.get(`[data-folder-id="${folder.id}"]`).click();
        
        // Test multiple file upload
        const files = ['test-doc1.pdf', 'test-doc2.pdf', 'test-doc3.pdf'];
        const startTime = performance.now();
        
        files.forEach((fileName, index) => {
          cy.fixture('test-document.pdf', 'base64').then((fileContent) => {
            cy.get('[data-testid="file-drop-zone"]').selectFile({
              contents: fileContent,
              fileName: fileName,
              mimeType: 'application/pdf'
            }, { action: 'drag-drop' });
          });
        });
        
        // Wait for all uploads to complete
        cy.get('[data-testid="upload-queue"]').should('not.exist').then(() => {
          const endTime = performance.now();
          const totalUploadTime = endTime - startTime;
          cy.task('log', `Multiple file upload time: ${totalUploadTime}ms`);
          expect(totalUploadTime).to.be.lessThan(30000); // 30 seconds max for 3 files
        });
        
        // Verify all files are uploaded
        cy.get('[data-testid="document-list"]').within(() => {
          files.forEach(fileName => {
            cy.contains(fileName).should('be.visible');
          });
        });
      });
    });
  });

  describe('Search Performance', () => {
    it('should perform content search efficiently', () => {
      cy.loginAsEditor();
      
      // Create test content for searching
      const searchTerms = ['news', 'event', 'meeting', 'policy', 'announcement'];
      searchTerms.forEach((term, index) => {
        cy.createContent(`${term} article ${index}`, `This is a ${term} content for search testing.`);
      });
      
      cy.visit('/content');
      
      // Test search performance
      const startTime = performance.now();
      cy.get('[data-testid="search-input"]').type('news');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="search-results"]').should('be.visible').then(() => {
        const endTime = performance.now();
        const searchTime = endTime - startTime;
        cy.task('log', `Content search time: ${searchTime}ms`);
        expect(searchTime).to.be.lessThan(2000); // 2 seconds max
      });
      
      // Verify search results
      cy.get('[data-testid="content-item"]').should('contain', 'news article');
    });

    it('should perform document search efficiently', () => {
      cy.loginAsEditor();
      cy.visit('/documents');
      
      // Create test documents
      cy.createFolder('Search Test Folder', true).then((folder) => {
        const documents = ['report.pdf', 'minutes.pdf', 'policy.pdf', 'agenda.pdf'];
        documents.forEach(docName => {
          cy.uploadDocument(docName, folder.id);
        });
        
        cy.reload();
        
        // Test document search
        const startTime = performance.now();
        cy.get('[data-testid="document-search"]').type('report');
        cy.get('[data-testid="search-button"]').click();
        
        cy.get('[data-testid="search-results"]').should('be.visible').then(() => {
          const endTime = performance.now();
          const searchTime = endTime - startTime;
          cy.task('log', `Document search time: ${searchTime}ms`);
          expect(searchTime).to.be.lessThan(1500); // 1.5 seconds max
        });
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during navigation', () => {
      cy.loginAsEditor();
      
      // Navigate through different pages multiple times
      const pages = ['/dashboard', '/content', '/documents', '/dashboard'];
      
      pages.forEach((page, index) => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        
        // Check memory usage
        cy.window().then((win) => {
          if ('memory' in win.performance) {
            const memory = (win.performance as any).memory;
            cy.task('log', `Memory usage at ${page}: ${memory.usedJSHeapSize / 1024 / 1024}MB`);
            
            // Basic memory leak detection
            if (index > 0) {
              expect(memory.usedJSHeapSize).to.be.lessThan(100 * 1024 * 1024); // 100MB max
            }
          }
        });
      });
    });
  });

  describe('Network Performance', () => {
    it('should minimize API calls during normal usage', () => {
      let apiCallCount = 0;
      
      // Intercept all API calls
      cy.intercept('**/api/**', (req) => {
        apiCallCount++;
        req.continue();
      }).as('apiCalls');
      
      cy.loginAsEditor();
      cy.visit('/content');
      
      // Perform typical user actions
      cy.get('[data-testid="create-content-button"]').click();
      cy.get('[data-testid="template-selector"]').click();
      cy.get('[data-testid="template-option-news"]').click();
      cy.get('[data-testid="content-title"]').type('API Test Content');
      cy.get('[data-testid="save-content-button"]').click();
      
      cy.get('[data-testid="success-message"]').should('be.visible').then(() => {
        cy.task('log', `Total API calls during content creation: ${apiCallCount}`);
        expect(apiCallCount).to.be.lessThan(10); // Should be efficient
      });
    });

    it('should handle slow network conditions gracefully', () => {
      // Simulate slow network
      cy.intercept('**/api/**', (req) => {
        req.reply((res) => {
          // Add 2 second delay to simulate slow network
          return new Promise(resolve => {
            setTimeout(() => resolve(res), 2000);
          });
        });
      }).as('slowApi');
      
      cy.loginAsEditor();
      cy.visit('/content');
      
      // Verify loading states are shown
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.get('[data-testid="content-list"]', { timeout: 15000 }).should('be.visible');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });
  });

  describe('Concurrent User Performance', () => {
    it('should handle multiple user sessions efficiently', () => {
      // Simulate multiple users by opening multiple sessions
      cy.loginAsAdmin();
      cy.visit('/users');
      
      // Create multiple test users
      const users = ['user1', 'user2', 'user3'];
      users.forEach(username => {
        cy.get('[data-testid="create-user-button"]').click();
        cy.get('[data-testid="username-input"]').type(username);
        cy.get('[data-testid="email-input"]').type(`${username}@test.com`);
        cy.get('[data-testid="password-input"]').type('password123');
        cy.get('[data-testid="role-select"]').select('editor');
        cy.get('[data-testid="save-user-button"]').click();
        cy.get('[data-testid="success-message"]').should('be.visible');
      });
      
      // Test concurrent content creation
      users.forEach((username, index) => {
        cy.login(username, 'password123', 'editor');
        cy.visit('/content');
        
        const startTime = performance.now();
        cy.createContent(`Concurrent Content ${index}`, `Content created by ${username}`).then(() => {
          const endTime = performance.now();
          const creationTime = endTime - startTime;
          cy.task('log', `Content creation time for ${username}: ${creationTime}ms`);
          expect(creationTime).to.be.lessThan(3000); // 3 seconds max even with concurrent users
        });
      });
    });
  });
}