import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const VIEWS = ['', 'basics', 'superposition', 'qubits', 'entanglement'];

for (const id of VIEWS) {
  test(`axe: no serious or critical violations in ${id || 'the lab'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(id ? `/#${id}` : '/');
    if (id) {
      await expect(
        page.getByRole('group', { name: 'Experiment controls' }).getByRole('button').first(),
      ).toBeVisible({
        timeout: 30_000,
      });
      // Include the expanded "Learn more" (equations) in the audit.
      await page.getByText('Learn more').click();
    } else {
      await expect(page.getByRole('navigation', { name: 'Experiments' })).toBeVisible();
    }
    const results = await new AxeBuilder({ page })
      // The WebGL canvas and its floating labels are decorative (aria-hidden); the DOM has the text.
      .exclude('canvas')
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of serious)
      for (const n of v.nodes) console.log(`${v.id} | ${n.target.join(' ')} | ${n.any[0]?.message ?? ''}`);
    expect(serious).toEqual([]);
  });
}
