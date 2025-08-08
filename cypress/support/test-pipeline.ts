/// <reference types="cypress" />

/**
 * Test Pipeline Configuration and Utilities
 * Provides automated testing pipeline functionality for CI/CD integration
 */

export interface TestSuite {
  name: string;
  pattern: string;
  parallel: boolean;
  retries: number;
  timeout: number;
}

export interface TestEnvironment {
  name: string;
  baseUrl: string;
  apiUrl: string;
  database: string;
}

export const TEST_SUITES: TestSuite[] = [
  {
    name: 'authentication',
    pattern: 'cypress/e2e/auth/**/*.cy.ts',
    parallel: false,
    retries: 2,
    timeout: 30000
  },
  {
    name: 'content-management',
    pattern: 'cypress/e2e/content/**/*.cy.ts',
    parallel: true,
    retries: 1,
    timeout: 45000
  },
  {
    name: 'document-management',
    pattern: 'cypress/e2e/documents/**/*.cy.ts',
    parallel: true,
    retries: 1,
    timeout: 60000
  },
  {
    name: 'user-roles',
    pattern: 'cypress/e2e/user-roles/**/*.cy.ts',
    parallel: false,
    retries: 2,
    timeout: 40000
  },
  {
    name: 'visual-regression',
    pattern: 'cypress/e2e/visual/**/*.cy.ts',
    parallel: true,
    retries: 0,
    timeout: 90000
  },
  {
    name: 'performance',
    pattern: 'cypress/e2e/performance/**/*.cy.ts',
    parallel: false,
    retries: 1,
    timeout: 120000
  }
];

export const TEST_ENVIRONMENTS: TestEnvironment[] = [
  {
    name: 'development',
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3000/api',
    database: 'cms_test_dev'
  },
  {
    name: 'staging',
    baseUrl: 'https://staging.cms.example.com',
    apiUrl: 'https://staging-api.cms.example.com/api',
    database: 'cms_test_staging'
  },
  {
    name: 'production',
    baseUrl: 'https://cms.example.com',
    apiUrl: 'https://api.cms.example.com/api',
    database: 'cms_test_prod'
  }
];

/**
 * Test data management utilities
 */
export class TestDataManager {
  static async seedTestData(environment: string): Promise<void> {
    const env = TEST_ENVIRONMENTS.find(e => e.name === environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Seed users
    await this.createTestUsers(env);
    
    // Seed content templates
    await this.createTestTemplates(env);
    
    // Seed sample content
    await this.createTestContent(env);
    
    // Seed document folders
    await this.createTestFolders(env);
  }

  static async cleanupTestData(environment: string): Promise<void> {
    const env = TEST_ENVIRONMENTS.find(e => e.name === environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Clean up in reverse order
    await this.cleanupTestFolders(env);
    await this.cleanupTestContent(env);
    await this.cleanupTestTemplates(env);
    await this.cleanupTestUsers(env);
  }

  private static async createTestUsers(env: TestEnvironment): Promise<void> {
    const users = [
      { username: 'admin', password: 'admin123', role: 'administrator', email: 'admin@test.com' },
      { username: 'editor', password: 'editor123', role: 'editor', email: 'editor@test.com' },
      { username: 'readonly', password: 'readonly123', role: 'read-only', email: 'readonly@test.com' }
    ];

    for (const user of users) {
      try {
        await cy.request({
          method: 'POST',
          url: `${env.apiUrl}/auth/register`,
          body: user,
          failOnStatusCode: false
        });
      } catch (error) {
        console.log(`User ${user.username} may already exist`);
      }
    }
  }

  private static async createTestTemplates(env: TestEnvironment): Promise<void> {
    const templates = [
      {
        name: 'News Article',
        id: 'news-template',
        htmlStructure: '<article><h1>{{title}}</h1><p class="summary">{{summary}}</p><div class="content">{{body}}</div></article>',
        cssStyles: '.summary { font-weight: bold; margin-bottom: 1rem; }',
        contentFields: [
          { name: 'title', type: 'text', required: true },
          { name: 'summary', type: 'textarea', required: true },
          { name: 'body', type: 'rich-text', required: true }
        ]
      },
      {
        name: 'Event Announcement',
        id: 'event-template',
        htmlStructure: '<article><h1>{{title}}</h1><div class="event-details"><p>Date: {{date}}</p><p>Time: {{time}}</p><p>Location: {{location}}</p></div><div class="content">{{description}}</div></article>',
        cssStyles: '.event-details { background: #f5f5f5; padding: 1rem; margin: 1rem 0; }',
        contentFields: [
          { name: 'title', type: 'text', required: true },
          { name: 'date', type: 'date', required: true },
          { name: 'time', type: 'time', required: false },
          { name: 'location', type: 'text', required: true },
          { name: 'description', type: 'rich-text', required: true }
        ]
      }
    ];

    const adminToken = await this.getAdminToken(env);
    
    for (const template of templates) {
      try {
        await cy.request({
          method: 'POST',
          url: `${env.apiUrl}/templates`,
          headers: { 'Authorization': `Bearer ${adminToken}` },
          body: template,
          failOnStatusCode: false
        });
      } catch (error) {
        console.log(`Template ${template.name} may already exist`);
      }
    }
  }

  private static async createTestContent(env: TestEnvironment): Promise<void> {
    const content = [
      {
        title: 'Welcome to Our Community',
        body: 'This is a welcome message for our community website.',
        templateId: 'news-template',
        status: 'published'
      },
      {
        title: 'Upcoming Town Hall Meeting',
        body: 'Join us for our monthly town hall meeting.',
        templateId: 'event-template',
        status: 'published'
      }
    ];

    const editorToken = await this.getEditorToken(env);
    
    for (const item of content) {
      try {
        await cy.request({
          method: 'POST',
          url: `${env.apiUrl}/content`,
          headers: { 'Authorization': `Bearer ${editorToken}` },
          body: item,
          failOnStatusCode: false
        });
      } catch (error) {
        console.log(`Content ${item.title} may already exist`);
      }
    }
  }

  private static async createTestFolders(env: TestEnvironment): Promise<void> {
    const folders = [
      { name: 'Public Documents', isPublic: true },
      { name: 'Meeting Minutes', isPublic: true },
      { name: 'Internal Documents', isPublic: false }
    ];

    const editorToken = await this.getEditorToken(env);
    
    for (const folder of folders) {
      try {
        await cy.request({
          method: 'POST',
          url: `${env.apiUrl}/folders`,
          headers: { 'Authorization': `Bearer ${editorToken}` },
          body: folder,
          failOnStatusCode: false
        });
      } catch (error) {
        console.log(`Folder ${folder.name} may already exist`);
      }
    }
  }

  private static async cleanupTestUsers(env: TestEnvironment): Promise<void> {
    // Implementation for cleanup
    console.log('Cleaning up test users...');
  }

  private static async cleanupTestTemplates(env: TestEnvironment): Promise<void> {
    // Implementation for cleanup
    console.log('Cleaning up test templates...');
  }

  private static async cleanupTestContent(env: TestEnvironment): Promise<void> {
    // Implementation for cleanup
    console.log('Cleaning up test content...');
  }

  private static async cleanupTestFolders(env: TestEnvironment): Promise<void> {
    // Implementation for cleanup
    console.log('Cleaning up test folders...');
  }

  private static async getAdminToken(env: TestEnvironment): Promise<string> {
    const response = await cy.request({
      method: 'POST',
      url: `${env.apiUrl}/auth/login`,
      body: { username: 'admin', password: 'admin123' }
    });
    return response.body.token;
  }

  private static async getEditorToken(env: TestEnvironment): Promise<string> {
    const response = await cy.request({
      method: 'POST',
      url: `${env.apiUrl}/auth/login`,
      body: { username: 'editor', password: 'editor123' }
    });
    return response.body.token;
  }
}

/**
 * Test reporting utilities
 */
export class TestReporter {
  static generateReport(results: any[]): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      results: results
    };

    console.log('Test Report:', JSON.stringify(report, null, 2));
  }

  static generateAccessibilityReport(violations: any[]): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations: violations.length,
      critical: violations.filter(v => v.impact === 'critical').length,
      serious: violations.filter(v => v.impact === 'serious').length,
      moderate: violations.filter(v => v.impact === 'moderate').length,
      minor: violations.filter(v => v.impact === 'minor').length,
      violations: violations
    };

    console.log('Accessibility Report:', JSON.stringify(report, null, 2));
  }

  static generatePerformanceReport(metrics: any[]): void {
    const report = {
      timestamp: new Date().toISOString(),
      averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
      averageFirstContentfulPaint: metrics.reduce((sum, m) => sum + m.fcp, 0) / metrics.length,
      slowestPage: metrics.reduce((prev, current) => (prev.loadTime > current.loadTime) ? prev : current),
      fastestPage: metrics.reduce((prev, current) => (prev.loadTime < current.loadTime) ? prev : current),
      metrics: metrics
    };

    console.log('Performance Report:', JSON.stringify(report, null, 2));
  }
}

/**
 * CI/CD Integration utilities
 */
export class CIPipeline {
  static async runTestSuite(suiteName: string, environment: string): Promise<boolean> {
    const suite = TEST_SUITES.find(s => s.name === suiteName);
    const env = TEST_ENVIRONMENTS.find(e => e.name === environment);
    
    if (!suite || !env) {
      throw new Error(`Suite ${suiteName} or environment ${environment} not found`);
    }

    console.log(`Running test suite: ${suiteName} on ${environment}`);
    
    try {
      // Setup test data
      await TestDataManager.seedTestData(environment);
      
      // Run tests
      const results = await this.executeTests(suite, env);
      
      // Generate reports
      TestReporter.generateReport(results);
      
      // Cleanup
      await TestDataManager.cleanupTestData(environment);
      
      return results.every(r => r.status === 'passed');
    } catch (error) {
      console.error(`Test suite ${suiteName} failed:`, error);
      return false;
    }
  }

  private static async executeTests(suite: TestSuite, env: TestEnvironment): Promise<any[]> {
    // Mock implementation - in real scenario, this would execute Cypress tests
    return [
      { name: 'test1', status: 'passed', duration: 1000 },
      { name: 'test2', status: 'passed', duration: 1500 }
    ];
  }

  static async runFullPipeline(environment: string): Promise<boolean> {
    console.log(`Running full test pipeline on ${environment}`);
    
    const results = [];
    
    for (const suite of TEST_SUITES) {
      const result = await this.runTestSuite(suite.name, environment);
      results.push({ suite: suite.name, passed: result });
      
      if (!result && suite.name === 'authentication') {
        // Stop pipeline if authentication tests fail
        console.error('Authentication tests failed, stopping pipeline');
        return false;
      }
    }
    
    const allPassed = results.every(r => r.passed);
    console.log(`Pipeline ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return allPassed;
  }
}