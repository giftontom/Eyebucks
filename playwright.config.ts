import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 1,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
});
