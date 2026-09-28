import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __quantumPerf?: { fps: number; frameMs: number; calls: number; triangles: number; tier: string };
  }
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('boots, renders WebGL, and publishes frame stats', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Quantum');
  await page.waitForFunction(() => !!window.__quantumPerf, undefined, { timeout: 20_000 });
  const perf = await page.evaluate(() => window.__quantumPerf!);
  console.log('perf', JSON.stringify(perf));
  expect(perf.calls).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/smoke.png' });
  expect(errors).toEqual([]);
});

test('progress rail navigates between sections', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const rail = page.getByRole('navigation', { name: 'Sections' });
  await expect(rail.getByRole('button')).toHaveCount(8);
  await rail.getByRole('button', { name: '4. Orbitals' }).click();
  await expect(rail.getByRole('button', { name: '4. Orbitals' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'Why atoms have shapes' })).toBeInViewport();
  // Keyboard: arrow down moves to the next section.
  await page.keyboard.press('ArrowDown');
  await expect(rail.getByRole('button', { name: '5. Uncertainty' })).toHaveAttribute('aria-current', 'step');
  expect(errors).toEqual([]);
});

test('settings expose quality, motion and explanation controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByText('High', { exact: true }).click();
  await expect(dialog.getByRole('radio', { name: 'High' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
