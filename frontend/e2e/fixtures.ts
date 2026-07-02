import { test as base, expect, type Page } from '@playwright/test';
import { seedUser, type Role, type SeededUser } from './seed';

interface ProfileFixtures {
  clientPage: Page;
  professionalPage: Page;
  adminPage: Page;
}

async function authenticate(page: Page, role: Role): Promise<SeededUser> {
  const user = await seedUser(role);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha').fill(user.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  return user;
}

export const test = base.extend<ProfileFixtures>({
  clientPage: async ({ page }, use) => {
    await authenticate(page, 'client');
    await use(page);
  },
  professionalPage: async ({ page }, use) => {
    await authenticate(page, 'professional');
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await authenticate(page, 'admin');
    await use(page);
  },
});

export { expect };
export type { Role, SeededUser };
