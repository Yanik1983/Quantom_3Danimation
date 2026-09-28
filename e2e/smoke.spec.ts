import { test, expect } from '@playwright/test';

test('boots and renders a WebGL canvas without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const hasGL = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return !!c && !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  expect(hasGL).toBe(true);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/smoke.png' });
  expect(errors).toEqual([]);
});
