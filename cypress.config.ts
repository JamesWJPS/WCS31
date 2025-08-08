import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      apiUrl: 'http://localhost:3000/api',
      coverage: true
    },
    setupNodeEvents(on, config) {
      // Visual regression testing plugin
      require('cypress-visual-regression/dist/plugin')(on, config);
      
      // Code coverage plugin
      require('@cypress/code-coverage/task')(on, config);
      
      // Performance testing plugin
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-dev-shm-usage');
        }
        return launchOptions;
      });

      // Task for logging
      on('task', {
        log(message) {
          console.log(message);
          return null;
        }
      });

      // File system tasks for test data management
      on('task', {
        async seedTestData() {
          // Implementation would connect to test database and seed data
          console.log('Seeding test data...');
          return null;
        },
        
        async cleanupTestData() {
          // Implementation would clean up test data
          console.log('Cleaning up test data...');
          return null;
        }
      });

      return config;
    }
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}'
  }
});