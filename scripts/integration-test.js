#!/usr/bin/env node

/**
 * Comprehensive integration testing script for the Web Communication CMS
 * This script validates all system components and their integration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
  constructor() {
    this.results = {
      backend: { passed: false, errors: [] },
      frontend: { passed: false, errors: [] },
      security: { passed: false, errors: [] },
      accessibility: { passed: false, errors: [] },
      e2e: { passed: false, errors: [] },
      performance: { passed: false, errors: [] }
    };
    
    this.processes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, cwd = process.cwd(), timeout = 60000) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command}`, 'info');
      
      const child = spawn('cmd', ['/c', command], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async startServices() {
    this.log('Starting backend and frontend services...', 'info');
    
    try {
      // Start backend
      const backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(process.cwd(), 'backend'),
        stdio: 'pipe',
        shell: true
      });
      
      this.processes.push(backendProcess);
      
      // Start frontend
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(process.cwd(), 'frontend'),
        stdio: 'pipe',
        shell: true
      });
      
      this.processes.push(frontendProcess);
      
      // Wait for services to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      this.log('Services started successfully', 'success');
    } catch (error) {
      this.log(`Failed to start services: ${error.message}`, 'error');
      throw error;
    }
  }

  async stopServices() {
    this.log('Stopping services...', 'info');
    
    this.processes.forEach(process => {
      try {
        process.kill();
      } catch (error) {
        // Process might already be dead
      }
    });
    
    this.processes = [];
  }

  async testBackend() {
    this.log('Testing backend...', 'info');
    
    try {
      // Run backend tests
      const result = await this.runCommand('npm test', path.join(process.cwd(), 'backend'));
      
      // Check if tests passed
      if (result.stdout.includes('Tests:') && !result.stdout.includes('failed')) {
        this.results.backend.passed = true;
        this.log('Backend tests passed', 'success');
      } else {
        this.results.backend.errors.push('Some backend tests failed');
        this.log('Backend tests failed', 'error');
      }
    } catch (error) {
      this.results.backend.errors.push(error.message);
      this.log(`Backend test error: ${error.message}`, 'error');
    }
  }

  async testFrontend() {
    this.log('Testing frontend...', 'info');
    
    try {
      // Run frontend tests
      const result = await this.runCommand('npm test -- --run', path.join(process.cwd(), 'frontend'));
      
      // Check if tests passed
      if (result.stdout.includes('Test Files') && !result.stdout.includes('failed')) {
        this.results.frontend.passed = true;
        this.log('Frontend tests passed', 'success');
      } else {
        this.results.frontend.errors.push('Some frontend tests failed');
        this.log('Frontend tests failed', 'error');
      }
    } catch (error) {
      this.results.frontend.errors.push(error.message);
      this.log(`Frontend test error: ${error.message}`, 'error');
    }
  }

  async testSecurity() {
    this.log('Testing security...', 'info');
    
    try {
      // Run security-specific tests
      const result = await this.runCommand(
        'npm test -- --testPathPattern=security',
        path.join(process.cwd(), 'backend')
      );
      
      if (result.stdout.includes('Tests:') && !result.stdout.includes('failed')) {
        this.results.security.passed = true;
        this.log('Security tests passed', 'success');
      } else {
        this.results.security.errors.push('Some security tests failed');
        this.log('Security tests failed', 'error');
      }
    } catch (error) {
      this.results.security.errors.push(error.message);
      this.log(`Security test error: ${error.message}`, 'error');
    }
  }

  async testAccessibility() {
    this.log('Testing accessibility...', 'info');
    
    try {
      // Run accessibility tests
      const result = await this.runCommand(
        'npm run test:accessibility',
        path.join(process.cwd(), 'frontend')
      );
      
      if (result.code === 0) {
        this.results.accessibility.passed = true;
        this.log('Accessibility tests passed', 'success');
      } else {
        this.results.accessibility.errors.push('Accessibility tests failed');
        this.log('Accessibility tests failed', 'error');
      }
    } catch (error) {
      this.results.accessibility.errors.push(error.message);
      this.log(`Accessibility test error: ${error.message}`, 'error');
    }
  }

  async testE2E() {
    this.log('Testing end-to-end functionality...', 'info');
    
    try {
      // Run E2E tests
      const result = await this.runCommand('npm run test:e2e:headless', process.cwd(), 120000);
      
      if (result.stdout.includes('All specs passed!') || result.code === 0) {
        this.results.e2e.passed = true;
        this.log('E2E tests passed', 'success');
      } else {
        this.results.e2e.errors.push('Some E2E tests failed');
        this.log('E2E tests failed', 'error');
      }
    } catch (error) {
      this.results.e2e.errors.push(error.message);
      this.log(`E2E test error: ${error.message}`, 'error');
    }
  }

  async testPerformance() {
    this.log('Testing performance...', 'info');
    
    try {
      // Run performance tests
      const result = await this.runCommand('npm run test:e2e:performance', process.cwd());
      
      if (result.code === 0) {
        this.results.performance.passed = true;
        this.log('Performance tests passed', 'success');
      } else {
        this.results.performance.errors.push('Performance tests failed');
        this.log('Performance tests failed', 'error');
      }
    } catch (error) {
      this.results.performance.errors.push(error.message);
      this.log(`Performance test error: ${error.message}`, 'error');
    }
  }

  async buildProduction() {
    this.log('Testing production build...', 'info');
    
    try {
      // Build backend
      await this.runCommand('npm run build:prod', path.join(process.cwd(), 'backend'));
      this.log('Backend production build successful', 'success');
      
      // Build frontend
      await this.runCommand('npm run build:prod', path.join(process.cwd(), 'frontend'));
      this.log('Frontend production build successful', 'success');
      
      return true;
    } catch (error) {
      this.log(`Production build failed: ${error.message}`, 'error');
      return false;
    }
  }

  generateReport() {
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: Math.round((passedTests / totalTests) * 100)
      },
      results: this.results
    };
    
    // Write JSON report
    const reportPath = path.join(process.cwd(), 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(process.cwd(), 'integration-test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    this.log(`Reports generated: ${reportPath}, ${htmlPath}`, 'success');
    
    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; }
        .number { font-size: 2em; font-weight: bold; }
        .passed { color: #27ae60; }
        .failed { color: #e74c3c; }
        .total { color: #3498db; }
        .test-section { background: white; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; }
        .test-status { width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        .test-status.passed { background: #27ae60; }
        .test-status.failed { background: #e74c3c; }
        .test-content { padding: 15px; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 10px; margin-top: 10px; }
        .error-item { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Integration Test Report</h1>
        <p>Generated on: ${report.timestamp}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Total Tests</h3>
            <div class="number total">${report.summary.total}</div>
        </div>
        <div class="summary-card">
            <h3>Passed</h3>
            <div class="number passed">${report.summary.passed}</div>
        </div>
        <div class="summary-card">
            <h3>Failed</h3>
            <div class="number failed">${report.summary.failed}</div>
        </div>
        <div class="summary-card">
            <h3>Success Rate</h3>
            <div class="number ${report.summary.failed === 0 ? 'passed' : 'failed'}">${report.summary.successRate}%</div>
        </div>
    </div>
    
    ${Object.entries(report.results).map(([testType, result]) => `
        <div class="test-section">
            <div class="test-header">
                <div class="test-status ${result.passed ? 'passed' : 'failed'}">
                    ${result.passed ? '✓' : '✗'}
                </div>
                <h3>${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests</h3>
            </div>
            <div class="test-content">
                <p><strong>Status:</strong> ${result.passed ? 'Passed' : 'Failed'}</p>
                ${result.errors.length > 0 ? `
                    <div class="errors">
                        <strong>Errors:</strong>
                        ${result.errors.map(error => `<div class="error-item">${error}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  async run() {
    this.log('Starting comprehensive integration testing...', 'info');
    
    try {
      // Test production build first
      const buildSuccess = await this.buildProduction();
      if (!buildSuccess) {
        this.log('Production build failed, continuing with tests...', 'warning');
      }
      
      // Start services for integration testing
      await this.startServices();
      
      // Run all test suites
      await Promise.all([
        this.testBackend(),
        this.testFrontend(),
        this.testSecurity(),
        this.testAccessibility()
      ]);
      
      // Run E2E tests (requires running services)
      await this.testE2E();
      await this.testPerformance();
      
    } catch (error) {
      this.log(`Integration testing error: ${error.message}`, 'error');
    } finally {
      // Always stop services
      await this.stopServices();
    }
    
    // Generate and display report
    const report = this.generateReport();
    
    this.log('\n📊 Integration Test Summary:', 'info');
    this.log(`Total test suites: ${report.summary.total}`, 'info');
    this.log(`Passed: ${report.summary.passed}`, 'success');
    this.log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
    this.log(`Success rate: ${report.summary.successRate}%`, report.summary.successRate === 100 ? 'success' : 'warning');
    
    if (report.summary.failed === 0) {
      this.log('🎉 All integration tests passed!', 'success');
      process.exit(0);
    } else {
      this.log('⚠️ Some integration tests failed. Check the report for details.', 'error');
      process.exit(1);
    }
  }
}

// Run integration tests if this script is executed directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;