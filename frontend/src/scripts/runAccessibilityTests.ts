#!/usr/bin/env node

/**
 * Script to run comprehensive accessibility tests across the application
 * This can be run as part of CI/CD pipeline or manually for accessibility audits
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  output: string;
  errors: string[];
}

const ACCESSIBILITY_TEST_FILES = [
  'src/test/__tests__/accessibility.test.tsx',
  'src/utils/__tests__/colorContrast.test.ts',
  'src/test/__tests__/keyboardNavigation.test.tsx',
  'src/test/__tests__/screenReader.test.tsx',
  'src/test/__tests__/accessibilityIntegration.test.tsx',
  // Add component-specific accessibility tests
  'src/components/ui/__tests__/Form.test.tsx',
  'src/components/ui/__tests__/Modal.test.tsx'
];

/**
 * Run a single test file and capture results
 */
const runTestFile = (testFile: string): TestResult => {
  console.log(`Running accessibility tests for: ${testFile}`);
  
  try {
    const output = execSync(`npm run test ${testFile}`, {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    return {
      testFile,
      passed: true,
      output,
      errors: []
    };
  } catch (error: any) {
    return {
      testFile,
      passed: false,
      output: error.stdout || '',
      errors: [error.message || 'Unknown error']
    };
  }
};

/**
 * Generate HTML report from test results
 */
const generateHTMLReport = (results: TestResult[]): string => {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .total { color: #007bff; }
        .test-results {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .test-result {
            border-bottom: 1px solid #eee;
            padding: 20px;
        }
        .test-result:last-child {
            border-bottom: none;
        }
        .test-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .test-status {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .test-status.passed {
            background-color: #28a745;
        }
        .test-status.failed {
            background-color: #dc3545;
        }
        .test-name {
            font-weight: bold;
            font-size: 1.1em;
        }
        .test-output {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        .errors {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 15px;
            margin-top: 10px;
            color: #721c24;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Accessibility Test Report</h1>
        <p>Comprehensive accessibility testing results for Web Communication CMS</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total Tests</h3>
            <div class="number total">${totalTests}</div>
        </div>
        <div class="summary-card">
            <h3>Passed</h3>
            <div class="number passed">${passedTests}</div>
        </div>
        <div class="summary-card">
            <h3>Failed</h3>
            <div class="number failed">${failedTests}</div>
        </div>
        <div class="summary-card">
            <h3>Success Rate</h3>
            <div class="number ${failedTests === 0 ? 'passed' : 'failed'}">
                ${Math.round((passedTests / totalTests) * 100)}%
            </div>
        </div>
    </div>

    <div class="test-results">
        ${results.map(result => `
            <div class="test-result">
                <div class="test-header">
                    <div class="test-status ${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✓' : '✗'}
                    </div>
                    <div class="test-name">${result.testFile}</div>
                </div>
                
                ${result.errors.length > 0 ? `
                    <div class="errors">
                        <strong>Errors:</strong>
                        <ul>
                            ${result.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <details>
                    <summary>View Test Output</summary>
                    <div class="test-output">${result.output}</div>
                </details>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>
            This report was generated automatically by the accessibility test suite.<br>
            For more information about accessibility testing, visit 
            <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank">WCAG 2.1 Quick Reference</a>
        </p>
    </div>
</body>
</html>
  `;
  
  return html;
};

/**
 * Generate markdown report from test results
 */
const generateMarkdownReport = (results: TestResult[]): string => {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  const markdown = `
# 🔍 Accessibility Test Report

Generated on: ${new Date().toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${totalTests} |
| Passed | ${passedTests} |
| Failed | ${failedTests} |
| Success Rate | ${Math.round((passedTests / totalTests) * 100)}% |

## Overall Status

${failedTests === 0 ? '✅ **All accessibility tests passed!**' : `❌ **${failedTests} test file(s) failed**`}

## Detailed Results

${results.map(result => `
### ${result.passed ? '✅' : '❌'} ${result.testFile}

${result.errors.length > 0 ? `
**Errors:**
${result.errors.map(error => `- ${error}`).join('\n')}
` : ''}

<details>
<summary>View Test Output</summary>

\`\`\`
${result.output}
\`\`\`

</details>

---
`).join('')}

## Recommendations

${failedTests > 0 ? `
### Failed Tests
Please review the failed tests above and address the accessibility issues found. Common issues include:

- Missing ARIA labels or descriptions
- Poor color contrast ratios
- Improper heading hierarchy
- Missing form labels
- Keyboard navigation problems
- Screen reader compatibility issues

### Next Steps
1. Fix the accessibility issues identified in the failed tests
2. Re-run the accessibility test suite
3. Consider adding more comprehensive accessibility tests for new components
4. Integrate accessibility testing into your CI/CD pipeline
` : `
### Excellent Work!
All accessibility tests are passing. Consider:

1. Adding more comprehensive tests as you develop new features
2. Regular accessibility audits with real users
3. Keeping up with WCAG guidelines updates
4. Training team members on accessibility best practices
`}

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Web Accessibility Evaluation Tools](https://www.w3.org/WAI/ER/tools/)
- [Color Contrast Analyzers](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
`;

  return markdown;
};

/**
 * Main function to run all accessibility tests
 */
const main = async (): Promise<void> => {
  console.log('🔍 Starting comprehensive accessibility test suite...\n');
  
  const results: TestResult[] = [];
  
  // Run each test file
  for (const testFile of ACCESSIBILITY_TEST_FILES) {
    const result = runTestFile(testFile);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${testFile} - PASSED`);
    } else {
      console.log(`❌ ${testFile} - FAILED`);
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  }
  
  console.log('\n📊 Generating reports...');
  
  // Generate reports
  const htmlReport = generateHTMLReport(results);
  const markdownReport = generateMarkdownReport(results);
  
  // Write reports to files
  const reportsDir = join(process.cwd(), 'accessibility-reports');
  
  try {
    // Create reports directory if it doesn't exist
    execSync(`mkdir -p ${reportsDir}`, { stdio: 'ignore' });
  } catch {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = join(reportsDir, `accessibility-report-${timestamp}.html`);
  const markdownPath = join(reportsDir, `accessibility-report-${timestamp}.md`);
  
  writeFileSync(htmlPath, htmlReport);
  writeFileSync(markdownPath, markdownReport);
  
  // Also write latest reports
  writeFileSync(join(reportsDir, 'accessibility-report-latest.html'), htmlReport);
  writeFileSync(join(reportsDir, 'accessibility-report-latest.md'), markdownReport);
  
  console.log(`📄 HTML report saved to: ${htmlPath}`);
  console.log(`📄 Markdown report saved to: ${markdownPath}`);
  
  // Summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n📈 Summary:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log(`   Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All accessibility tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some accessibility tests failed. Please review the reports.');
    process.exit(1);
  }
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error running accessibility tests:', error);
    process.exit(1);
  });
}

export { main as runAccessibilityTests };