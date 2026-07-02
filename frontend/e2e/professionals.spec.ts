import type { Page } from '@playwright/test';
import { request } from '@playwright/test';
import { test, expect } from './fixtures';
import { seedCategory, seedUser } from './seed';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

async function seedOpenDemand(title: string): Promise<void> {
  const categoryId = seedCategory();
  const client = await seedUser('client');
  const context = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${client.accessToken}` },
  });
  try {
    const response = await context.post('/api/demands', {
      data: {
        categoryId,
        title,
        description: 'Preciso de um profissional para orçar este serviço com urgência.',
        budgetMin: 200,
        budgetMax: 800,
        addressId: null,
        tagIds: [],
        images: [],
      },
    });
    if (!response.ok()) {
      throw new Error(`seed demand failed: ${response.status()} ${await response.text()}`);
    }
  } finally {
    await context.dispose();
  }
}

test.describe('jornada do profissional', () => {
  test('edita a bio do perfil profissional', async ({ professionalPage }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const bio = `Especialista em reformas residenciais ${unique}`;

    await spaNavigate(professionalPage, '/professional/dashboard');
    await expect(professionalPage.getByRole('heading', { name: 'Perfil profissional' })).toBeVisible();

    await professionalPage.getByLabel('Titulo').fill(`Eletricista ${unique}`);
    await professionalPage.getByLabel('Biografia').fill(bio);
    await professionalPage.getByRole('button', { name: 'Salvar perfil' }).click();

    await expect(professionalPage.getByRole('button', { name: 'Salvar perfil' })).toBeVisible();
    await expect(professionalPage.getByLabel('Biografia')).toHaveValue(bio);
  });

  test('acessa a carteira e vê o saldo', async ({ professionalPage }) => {
    await spaNavigate(professionalPage, '/wallet');

    await expect(professionalPage.getByRole('heading', { name: 'Carteira' })).toBeVisible();
    await expect(professionalPage.getByText('Saldo disponível')).toBeVisible();
    await expect(professionalPage.getByText('R$ 0,00', { exact: true })).toBeVisible();
  });

  test('navega pelas demandas abertas disponíveis', async ({ professionalPage }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const title = `Pintura de fachada ${unique}`;
    await seedOpenDemand(title);

    await spaNavigate(professionalPage, '/demands');
    await expect(professionalPage.getByRole('heading', { name: 'Demandas' })).toBeVisible();
    await expect(professionalPage.getByText(title)).toBeVisible();

    await professionalPage.getByText(title).click();
    await professionalPage.waitForURL(/\/demands\/[0-9a-f-]+$/);
    await expect(professionalPage.getByRole('heading', { name: title })).toBeVisible();
  });
});
