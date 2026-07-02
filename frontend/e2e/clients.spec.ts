import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { seedCategory } from './seed';

async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('jornada do cliente', () => {
  test('publica uma demanda e a vê na lista', async ({ clientPage }) => {
    const categoryId = seedCategory();
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const title = `Reforma de banheiro ${unique}`;

    await spaNavigate(clientPage, '/demands/new');
    await clientPage.getByLabel('Categoria').fill(categoryId);
    await clientPage.getByLabel('Título').fill(title);
    await clientPage.getByLabel('Descrição').fill('Preciso trocar todo o revestimento e a tubulação do banheiro.');
    await clientPage.getByLabel('Orçamento mínimo').fill('500');
    await clientPage.getByLabel('Orçamento máximo').fill('1500');
    await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();

    await clientPage.waitForURL(/\/demands\/[0-9a-f-]+$/);
    await expect(clientPage.getByRole('heading', { name: title })).toBeVisible();

    await spaNavigate(clientPage, '/demands');
    await expect(clientPage.getByText(title)).toBeVisible();
  });

  test('vê a lista de demandas do próprio cliente', async ({ clientPage }) => {
    const categoryId = seedCategory();
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const title = `Instalação elétrica ${unique}`;

    await spaNavigate(clientPage, '/demands/new');
    await clientPage.getByLabel('Categoria').fill(categoryId);
    await clientPage.getByLabel('Título').fill(title);
    await clientPage.getByLabel('Descrição').fill('Preciso instalar pontos de energia novos na garagem.');
    await clientPage.getByLabel('Orçamento mínimo').fill('300');
    await clientPage.getByLabel('Orçamento máximo').fill('900');
    await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();
    await clientPage.waitForURL(/\/demands\/[0-9a-f-]+$/);

    await spaNavigate(clientPage, '/demands');
    await expect(clientPage.getByRole('heading', { name: 'Demandas' })).toBeVisible();
    await expect(clientPage.getByText(title)).toBeVisible();
  });

  test('não acessa o painel administrativo', async ({ clientPage }) => {
    await spaNavigate(clientPage, '/admin');
    await expect(clientPage).toHaveURL(/\/forbidden$/);
  });
});
