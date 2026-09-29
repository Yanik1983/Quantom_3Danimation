import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const VIEWS = ['', 'basics', 'superposition', 'qubits', 'entanglement', 'search', 'computer'];
const LABELS = {
  en: { controls: 'Experiment controls', learnMore: 'Learn more', menu: 'Experiments' },
  he: { controls: 'פקדי הניסוי', learnMore: 'לקריאה נוספת', menu: 'ניסויים' },
};
const RUNS = [
  ...VIEWS.map((id) => ({ id, lang: 'en' as const })),
  ...['', 'superposition', 'search'].map((id) => ({ id, lang: 'he' as const })),
];

for (const { id, lang } of RUNS) {
  const where = `${id || 'the lab'}${lang === 'he' ? ' (Hebrew)' : ''}`;
  test(`axe: no serious or critical violations in ${where}`, async ({ page }) => {
    const l = LABELS[lang];
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?lang=${lang}${id ? `#${id}` : ''}`);
    if (id === 'computer') {
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    } else if (id) {
      await expect(page.getByRole('group', { name: l.controls }).getByRole('button').first()).toBeVisible({
        timeout: 30_000,
      });
      // Include the expanded "Learn more" (equations) in the audit.
      await page.getByText(l.learnMore).click();
    } else {
      await expect(page.getByRole('navigation', { name: l.menu })).toBeVisible();
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
