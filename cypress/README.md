# End-to-End Testing Suite

This directory contains a comprehensive end-to-end testing suite for the Web Communication CMS, built with Cypress and designed to test all user workflows, role permissions, visual regression, and performance metrics.

## Overview

The testing suite covers:

- **Authentication workflows** - Login, logout, session management
- **User role permissions** - Administrator, editor, and read-only access controls
- **Content management** - Creating, editing, publishing content with templates
- **Document management** - File uploads, folder organization, permission controls
- **Visual regression testing** - Template rendering consistency across devices
- **Performance testing** - Page load times, API response times, file upload performance
- **Accessibility compliance** - WCAG 2.2 standards validation

## Test Structure

```
cypress/
├── e2e/                          # End-to-end test specifications
│   ├── auth/                     # Authentication tests
│   ├── content/                  # Content management tests
│   ├── documents/                # Document management tests
│   ├── user-roles/               # Role-based permission tests
│   ├── visual/                   # Visual regression tests
│   └── performance/              # Performance tests
├── fixtures/                     # Test data fixtures
├── reports/                      # Generated test reports
├── screenshots/                  # Test failure screenshots
├── snapshots/                    # Visual regression baselines
├── support/                      # Support files and commands
│   ├── commands.ts               # Custom Cypress commands
│   ├── e2e.ts                    # E2E test configuration
│   └── test-pipeline.ts          # Test pipeline utilities
└── scripts/                      # Test execution scripts
    └── run-e2e-tests.js          # Comprehensive test runner
```

## Requirements Coverage

The test suite validates the following requirements:

### Requirement 1.1 - Administrator Access
- ✅ Full system access including user management
- ✅ Content management capabilities
- ✅ System administration functions

### Requirement 2.1 - Editor Content Access
- ✅ Content creation and editing interface
- ✅ Template selection and application
- ✅ Content publishing workflows

### Requirement 3.1 - Public Website Access
- ✅ WCAG 2.2 accessibility compliance
- ✅ Template-based content display
- ✅ Public document access

### Requirement 4.1 - Document Organization
- ✅ Folder creation and management
- ✅ File upload and organization
- ✅ Permission-based access control

### Requirement 8.1 - Read-Only Access
- ✅ View-only content access
- ✅ Document viewing permissions
- ✅ Appropriate access restrictions

## Running Tests

### Prerequisites

1. **Application Running**: Ensure both frontend and backend are running
   ```bash
   npm run dev
   ```

2. **Test Database**: Set up test database with seed data
   ```bash
   npm run seed:test
   ```

### Quick Start

```bash
# Run all tests in development environment
npm run test:e2e

# Open Cypress Test Runner for interactive testing
npm run test:e2e:open

# Run specific test suites
npm run test:e2e:auth          # Authentication tests
npm run test:e2e:content       # Content management tests
npm run test:e2e:documents     # Document management tests
npm run test:e2e:roles         # User role tests
npm run test:e2e:visual        # Visual regression tests
npm run test:e2e:performance   # Performance tests

# Run accessibility-focused tests
npm run test:accessibility
```

### Environment-Specific Testing

```bash
# Development environment (default)
npm run test:e2e

# Staging environment
npm run test:e2e:staging

# Custom environment
CYPRESS_baseUrl=https://custom.url cypress run
```

### Headless Testing

```bash
# Run all tests headlessly (CI mode)
npm run test:e2e:headless

# Run with specific browser
cypress run --browser chrome
cypress run --browser firefox
cypress run --browser edge
```

## Test Configuration

### Cypress Configuration

Key configuration options in `cypress.config.ts`:

```typescript
{
  baseUrl: 'http://localhost:5173',
  viewportWidth: 1280,
  viewportHeight: 720,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 10000,
  video: true,
  screenshotOnRunFailure: true
}
```

### Environment Variables

```bash
CYPRESS_baseUrl=http://localhost:5173
CYPRESS_apiUrl=http://localhost:3000/api
CYPRESS_RECORD_KEY=your-cypress-record-key
```

## Custom Commands

The test suite includes custom Cypress commands for common operations:

### Authentication Commands
```typescript
cy.login(username, password, role)     // Login with specific user
cy.loginAsAdmin()                       // Quick admin login
cy.loginAsEditor()                      // Quick editor login
cy.loginAsReadOnly()                    // Quick read-only login
cy.logout()                             // Logout current user
```

### Content Management Commands
```typescript
cy.createContent(title, content, templateId)  // Create content via API
cy.deleteContent(contentId)                    // Delete content via API
```

### Document Management Commands
```typescript
cy.createFolder(name, isPublic, parentId)     // Create folder via API
cy.uploadDocument(fileName, folderId)          // Upload document via API
```

### Testing Utilities
```typescript
cy.checkA11y(context, options)                // Run accessibility tests
cy.measurePerformance(name)                   // Measure page performance
cy.compareSnapshot(name, options)             // Visual regression testing
cy.setViewport(size)                          // Set responsive viewport
cy.seedDatabase()                             // Seed test data
cy.cleanupTestData()                          // Clean up test data
```

## Test Data Management

### Fixtures

Test data is stored in `cypress/fixtures/`:

- `test-users.json` - User accounts for testing
- `test-content.json` - Sample content for different templates
- `test-templates.json` - Template definitions

### Database Seeding

```bash
# Seed test database
npm run seed:test

# Clean up test data
npm run cleanup:test
```

### Test Isolation

Each test suite includes proper setup and teardown:

```typescript
beforeEach(() => {
  cy.seedDatabase();
});

afterEach(() => {
  cy.cleanupTestData();
});
```

## Visual Regression Testing

Visual regression tests ensure template consistency across:

- **Devices**: Desktop, tablet, mobile viewports
- **Browsers**: Chrome, Firefox, Edge
- **Templates**: All content templates
- **States**: Different content states and user roles

### Baseline Management

```bash
# Generate new baselines
cypress run --env updateSnapshots=true

# Compare against baselines
cypress run --spec "cypress/e2e/visual/**/*.cy.ts"
```

## Performance Testing

Performance tests validate:

- **Page Load Times**: < 3 seconds for critical pages
- **API Response Times**: < 1 second for most endpoints
- **File Upload Performance**: Reasonable upload times
- **Search Performance**: < 2 seconds for search results
- **Memory Usage**: No memory leaks during navigation

### Performance Thresholds

```typescript
// Page load time thresholds
expect(loadTime).to.be.lessThan(3000);        // 3 seconds max
expect(domContentLoaded).to.be.lessThan(1500); // 1.5 seconds max

// API response time thresholds
expect(responseTime).to.be.lessThan(1000);     // 1 second max
```

## Accessibility Testing

Accessibility tests ensure WCAG 2.2 compliance:

- **Automated Testing**: Using axe-core for automated checks
- **Keyboard Navigation**: Tab order and focus management
- **Screen Reader Compatibility**: ARIA labels and semantic HTML
- **Color Contrast**: Minimum contrast ratios
- **Form Accessibility**: Proper labels and error messages

### Accessibility Rules

```typescript
cy.checkA11y(context, {
  rules: {
    'color-contrast': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'skip-link': { enabled: true }
  }
});
```

## CI/CD Integration

### GitHub Actions

The test suite integrates with GitHub Actions for:

- **Pull Request Testing**: Automated testing on PRs
- **Scheduled Testing**: Daily test runs
- **Multi-browser Testing**: Chrome, Firefox, Edge
- **Parallel Execution**: Faster test completion
- **Artifact Collection**: Screenshots, videos, reports

### Test Reports

Generated reports include:

- **Test Summary**: Pass/fail status for all suites
- **Accessibility Report**: WCAG compliance violations
- **Performance Report**: Load times and performance metrics
- **Visual Regression Report**: Screenshot comparisons
- **Coverage Report**: Code coverage from E2E tests

## Troubleshooting

### Common Issues

1. **Tests Timing Out**
   - Increase timeout values in cypress.config.ts
   - Check if application is running and accessible
   - Verify database connectivity

2. **Visual Regression Failures**
   - Update baselines if intentional changes were made
   - Check for browser/OS differences
   - Verify viewport consistency

3. **Authentication Failures**
   - Ensure test users exist in database
   - Check API endpoint availability
   - Verify JWT token handling

4. **Performance Test Failures**
   - Check system resources during test execution
   - Verify network conditions
   - Review performance thresholds

### Debug Mode

```bash
# Run tests with debug output
DEBUG=cypress:* cypress run

# Open DevTools during test execution
cypress open --config chromeWebSecurity=false
```

### Test Data Issues

```bash
# Reset test database
npm run cleanup:test
npm run seed:test

# Check database connection
npm run health-check
```

## Contributing

When adding new tests:

1. **Follow Naming Conventions**: Use descriptive test names
2. **Include Requirements**: Reference specific requirements being tested
3. **Add Accessibility Checks**: Include `cy.checkA11y()` in UI tests
4. **Clean Up**: Ensure proper test data cleanup
5. **Document Changes**: Update this README for new test patterns

### Test Writing Guidelines

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.seedDatabase();
    cy.loginAsEditor();
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  it('should perform specific action - Requirement X.X', () => {
    // Test implementation
    cy.checkA11y(); // Always include accessibility check
  });
});
```

## Support

For questions or issues with the testing suite:

1. Check this README for common solutions
2. Review existing test patterns in the codebase
3. Check Cypress documentation for framework-specific issues
4. Create an issue with detailed reproduction steps