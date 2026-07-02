import { test, expect, request, type Page } from '@playwright/test';
import { seedCategory, seedUser } from './seed';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test.describe('fluxo cruzando perfis de cliente e profissional', () => {
  test('cliente publica demanda, profissional envia orçamento pelo formulário, cliente visualiza e aceita', async ({
    browser,
  }) => {
    const categoryId = seedCategory();
    const client = await seedUser('client');
    const professional = await seedUser('professional');

    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const title = `Instalação de ar-condicionado ${unique}`;

    const clientContext = await browser.newContext();
    const professionalContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    const professionalPage = await professionalContext.newPage();

    try {
      await loginAsUser(clientPage, client.email, client.password);

      await spaNavigate(clientPage, '/demands/new');
      await clientPage.getByLabel('Categoria').fill(categoryId);
      await clientPage.getByLabel('Título').fill(title);
      await clientPage
        .getByLabel('Descrição')
        .fill('Preciso instalar dois splits em ambientes distintos com urgência.');
      await clientPage.getByLabel('Orçamento mínimo').fill('800');
      await clientPage.getByLabel('Orçamento máximo').fill('2500');
      await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();

      await clientPage.waitForURL(/\/demands\/[0-9a-f-]+$/);
      await expect(clientPage.getByRole('heading', { name: title })).toBeVisible();

      const demandId = clientPage.url().split('/demands/')[1];

      await loginAsUser(professionalPage, professional.email, professional.password);

      await spaNavigate(professionalPage, '/demands');
      await expect(professionalPage.getByRole('heading', { name: 'Demandas' })).toBeVisible();
      await expect(professionalPage.getByText(title)).toBeVisible();

      await professionalPage.getByText(title).click();
      await professionalPage.waitForURL(/\/demands\/[0-9a-f-]+$/);
      await expect(professionalPage.getByRole('heading', { name: title })).toBeVisible();
      await expect(professionalPage.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();

      const professionalApi = await request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: { Authorization: `Bearer ${professional.accessToken}` },
      });

      try {
        const profileResponse = await professionalApi.put('/api/professionals/me', {
          data: {
            headline: 'Especialista em climatização',
            bio: 'Atendo instalações e manutenções de ar-condicionado residencial.',
            yearsExperience: 5,
            hourlyRate: 90,
            serviceRadiusKm: 25,
          },
        });
        expect(profileResponse.ok()).toBeTruthy();
      } finally {
        await professionalApi.dispose();
      }

      await professionalPage.reload();
      await expect(professionalPage.getByRole('heading', { name: 'Enviar orçamento' })).toBeVisible();

      await professionalPage.getByLabel('Mensagem ao cliente').fill('Posso realizar a instalação ainda esta semana.');
      await professionalPage.getByPlaceholder('Descrição').fill('Instalação de split 12000 BTU');
      await professionalPage.getByPlaceholder('Qtd').fill('2');
      await professionalPage.getByPlaceholder('Preço unit.').fill('450');
      await professionalPage.getByRole('button', { name: 'Enviar orçamento' }).click();

      await expect(professionalPage.getByText('R$ 900,00')).toBeVisible();

      await loginAsUser(clientPage, client.email, client.password);
      await spaNavigate(clientPage, `/demands/${demandId}`);
      await expect(clientPage.getByText('R$ 900,00')).toBeVisible();
      await expect(clientPage.getByRole('button', { name: 'Aceitar' })).toBeVisible();
    } finally {
      await clientContext.close();
      await professionalContext.close();
    }
  });
});
