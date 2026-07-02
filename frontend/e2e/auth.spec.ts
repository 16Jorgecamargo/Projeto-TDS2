import { test, expect } from './fixtures';
import { seedUser } from './seed';

test.describe('autenticação', () => {
  test('login com credenciais válidas leva para a home', async ({ page }) => {
    const user = await seedUser('client');
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(user.email);
    await page.getByLabel('Senha').fill(user.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await expect(page).toHaveURL('/');
  });

  test('login com senha errada mostra erro e permanece em /login', async ({ page }) => {
    const user = await seedUser('client');
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(user.email);
    await page.getByLabel('Senha').fill('SenhaErrada123!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Credenciais invalidas')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('registro cria conta nova e autentica', async ({ page }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const email = `e2e-register-${unique}@example.com`;
    const phone = `+5551${String(unique).padStart(9, '0').slice(-9)}`;

    await page.goto('/register');
    await page.getByLabel('Nome').fill(`E2E Register ${unique}`);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Telefone').fill(phone);
    await page.getByLabel('Senha', { exact: true }).fill('Senha123!');
    await page.getByLabel('Confirmar senha').fill('Senha123!');
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/login') && !url.pathname.startsWith('/register'));
    await expect(page).toHaveURL(/\/verify-email$/);
  });

  test('acessar rota protegida sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page).toHaveURL(/\/login$/);
  });
});
