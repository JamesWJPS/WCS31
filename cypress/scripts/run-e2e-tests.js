#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner
 * Orchestrates the execution of all test suites with proper setup and teardown
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  environments: {
    development: {
      baseUrl: 'http://localhost:5173',
      apiUrl: 'http://localhost:3000/api'
    },
    staging: {
      baseUrl: process.env.STAGING_URL || 'https://staging.cms.example.com',
      apiUrl: process.env.STAGING_API_URL || 'https://staging-api.cms.example.com/api'
    }
  },
  suites: [
    {
      name: 'authentication',
      spec: 'cypress/e2e/auth/**/*.cy.ts',
      critical: true,
      parallel: false
    },
    {
      name: 'user-roles',
      spec: 'cypress/e2e/user-roles/**/*.cy.ts',
      critical: true,
      parallel: false
    },
    {
      name: 'content-management',
      spec: 'cypress/e2e/content/**/*.cy.ts',
      critical: false,
      parallel: true
    },
    {
      name: 'document-management',
      spec: 'cypress/e2e/documents/**/*.cy.ts',
      critical: false,
      parallel: true
    },
    {
      name: 'visual-regression',
      spec: 'cypress/e2e/visual/**/*.cy.ts',
      critical: false,
      parallel: true
    },
    {
      name: 'performance',
      spec: 'cypress/e2e/performance/**/*.cy.ts',
      critical: false,
      parallel: false
    }
  ]
};

class TestRunner {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = TEST_CONFIG.environments[environment];
    this.results = [];
    this.startTime = Date.now();
    
    if (!this.config) {
      throw new Error(`Environment ${environment} not configured`);
    }
  }

  async run() {
    console.log(`🚀 Starting E2E test suite on ${this.environment}`);
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`API URL: ${this.config.apiUrl}`);
    
    try {
      // Setup test environment
      await this.setupEnvironment();
      
      // Run test suites
      for (const suite of TEST_CONFIG.suites) {
        const result = await this.runTestSuite(suite);
        this.results.push(result);
        
        // Stop if critical test fails
        if (suite.critical && !result.success) {
          console.error(`❌ Critical test suite ${suite.name} failed. Stopping execution.`);
          break;
        }
      }
      
      // Generate reports
      await this.generateReports();
      
      // Cleanup
      await this.cleanup();
      
      const success = this.results.every(r => r.success);
      console.log(success ? '✅ All tests passed!' : '❌ Some tests failed');
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Wait for services to be ready
    await this.waitForServices();
    
    // Seed test data
    await this.seedTestData();
    
    console.log('✅ Environment setup complete');
  }

  async waitForServices() {
    console.log('⏳ Waiting for services to be ready...');
    
    const maxRetries = 30;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Check frontend
        execSync(`curl -f ${this.config.baseUrl} > /dev/null 2>&1`, { stdio: 'ignore' });
        
        // Check backend API
        execSync(`curl -f ${this.config.apiUrl}/health > /dev/null 2>&1`, { stdio: 'ignore' });
        
        console.log('✅ Services are ready');
        return;
      } catch (error) {
        retries++;
        console.log(`⏳ Services not ready, retrying... (${retries}/${maxRetries})`);
        await this.sleep(2000);
      }
    }
    
    throw new Error('Services failed to start within timeout');
  }

  async seedTestData() {
    console.log('🌱 Seeding test data...');
    
    try {
      // Run database seed script
      execSync('npm run seed:test', { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          API_URL: this.config.apiUrl 
        }
      });
      
      console.log('✅ Test data seeded');
    } catch (error) {
      console.warn('⚠️ Test data seeding failed, continuing with existing data');
    }
  }

  async runTestSuite(suite) {
    console.log(`\n🧪 Running ${suite.name} tests...`);
    
    const startTime = Date.now();
    
    try {
      const command = this.buildCypressCommand(suite);
      execSync(command, { stdio: 'inherit' });
      
      const duration = Date.now() - startTime;
      const result = {
        name: suite.name,
        success: true,
        duration,
        error: null
      };
      
      console.log(`✅ ${suite.name} tests passed (${duration}ms)`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        name: suite.name,
        success: false,
        duration,
        error: error.message
      };
      
      console.log(`❌ ${suite.name} tests failed (${duration}ms)`);
      return result;
    }
  }

  buildCypressCommand(suite) {
    const baseCommand = 'npx cypress run';
    const options = [
      `--spec "${suite.spec}"`,
      `--env baseUrl=${this.config.baseUrl},apiUrl=${this.config.apiUrl}`,
      '--reporter json',
      `--reporter-options "reporterEnabled=json,outputFile=cypress/reports/${suite.name}-results.json"`
    ];
    
    if (suite.parallel && process.env.CI) {
      options.push('--parallel');
      options.push('--record');
    }
    
    if (this.environment !== 'development') {
      options.push('--headless');
    }
    
    return `${baseCommand} ${options.join(' ')}`;
  }

  async generateReports() {
    console.log('\n📊 Generating test reports...');
    
    // Create reports directory
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate summary report
    const summary = {
      environment: this.environment,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      totalSuites: this.results.length,
      passedSuites: this.results.filter(r => r.success).length,
      failedSuites: this.results.filter(r => !r.success).length,
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(reportsDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Generate HTML report
    await this.generateHtmlReport(summary);
    
    console.log('✅ Reports generated');
  }

  async generateHtmlReport(summary) {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .suite { margin: 10px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; }
        .suite.passed { border-left: 4px solid #28a745; }
        .suite.failed { border-left: 4px solid #dc3545; }
        .duration { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>E2E Test Report</h1>
        <p><strong>Environment:</strong> ${summary.environment}</p>
        <p><strong>Timestamp:</strong> ${summary.timestamp}</p>
        <p><strong>Duration:</strong> ${summary.duration}ms</p>
        <p><strong>Results:</strong> 
            <span class="success">${summary.passedSuites} passed</span>, 
            <span class="failure">${summary.failedSuites} failed</span>
        </p>
    </div>
    
    <h2>Test Suites</h2>
    ${summary.results.map(result => `
        <div class="suite ${result.success ? 'passed' : 'failed'}">
            <h3>${result.name} ${result.success ? '✅' : '❌'}</h3>
            <p class="duration">Duration: ${result.duration}ms</p>
            ${result.error ? `<p class="failure">Error: ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
    
    fs.writeFileSync(
      path.join(__dirname, '../reports/test-report.html'),
      htmlTemplate
    );
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Clean up test data
      execSync('npm run cleanup:test', { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          API_URL: this.config.apiUrl 
        }
      });
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
const args = process.argv.slice(2);
const environment = args[0] || 'development';

const runner = new TestRunner(environment);
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});