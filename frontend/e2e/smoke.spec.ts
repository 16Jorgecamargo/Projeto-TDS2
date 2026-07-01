import { test, expect } from './fixtures';

test.describe('playwright base', () => {
  test('boots a browser context', async ({ page }) => {
    await page.goto('about:blank');
    expect(page.url()).toBe('about:blank');
  });
});
