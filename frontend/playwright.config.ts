import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth',
      testMatch: ['smoke.spec.ts', 'auth.spec.ts', 'auth/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'clients',
      testMatch: ['clients.spec.ts', 'clients/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'professionals',
      testMatch: ['professionals.spec.ts', 'professionals/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admins',
      testMatch: ['admins.spec.ts', 'admins/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'flows',
      testMatch: ['flows.spec.ts', 'flows/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
