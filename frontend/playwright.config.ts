import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth',
      testMatch: ['smoke.spec.ts', 'auth/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'clients',
      testMatch: ['clients/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/client.json' },
    },
    {
      name: 'professionals',
      testMatch: ['professionals/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/professional.json' },
    },
    {
      name: 'admins',
      testMatch: ['admins/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
    },
    {
      name: 'flows',
      testMatch: ['flows/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
