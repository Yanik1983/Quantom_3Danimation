import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const SECTIONS = [
  '',
  'double-slit',
  'wavefunction',
  'superposition',
  'orbitals',
  'uncertainty',
  'tunneling',
  'entanglement',
  'applications',
];

for (const id of SECTIONS) {
  test(`axe: no serious or critical violations at ${id || 'intro'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(id ? `/#${id}` : '/');
    if (id) await expect(page.locator(`#${id}`).getByRole('group').first()).toBeVisible({ timeout: 30_000 });
    const results = await new AxeBuilder({ page })
      // The WebGL canvas is decorative (aria-hidden); every scene has a text alternative.
      .exclude('canvas')
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of serious)
      for (const n of v.nodes) console.log(`${v.id} | ${n.target.join(' ')} | ${n.any[0]?.message ?? ''}`);
    expect(serious).toEqual([]);
  });
}
