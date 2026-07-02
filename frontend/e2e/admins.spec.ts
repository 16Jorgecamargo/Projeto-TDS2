import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('moderação do admin', () => {
  test('acessa o painel administrativo', async ({ adminPage }) => {
    await spaNavigate(adminPage, '/admin');

    await expect(adminPage.getByRole('heading', { name: 'Moderação' })).toBeVisible();
  });

  test('vê a seção de denúncias no painel', async ({ adminPage }) => {
    await spaNavigate(adminPage, '/admin');

    await expect(adminPage.getByRole('heading', { name: 'Denúncias' })).toBeVisible();
    await expect(
      adminPage.getByText('Carregando denúncias...').or(adminPage.getByText('Nenhuma denúncia pendente.')),
    ).toBeVisible();
  });

  test('vê a seção de disputas de contrato no painel', async ({ adminPage }) => {
    await spaNavigate(adminPage, '/admin');

    await expect(adminPage.getByRole('heading', { name: 'Disputas' })).toBeVisible();
    await expect(
      adminPage.getByText('Carregando disputas...').or(adminPage.getByText('Nenhuma disputa em aberto.')),
    ).toBeVisible();
  });
});
