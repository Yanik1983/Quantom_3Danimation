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

const card = (page: Page) => page.getByRole('group', { name: 'Experiment controls' });
const menu = (page: Page) => page.getByRole('navigation', { name: 'Experiments' });

async function setRange(page: Page, label: string, value: number) {
  await page.getByLabel(label).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('the lab boots, renders WebGL and offers four experiments', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quantum physics, simply explained');
  await expect(page.getByText('Choose an experiment to begin.')).toBeVisible();
  await expect(menu(page).getByRole('button')).toHaveText([
    /What is quantum physics\?/,
    /Superposition/,
    /Qubits/,
    /Entanglement/,
  ]);
  await page.waitForFunction(() => !!window.__quantumPerf, undefined, { timeout: 20_000 });
  const perf = await page.evaluate(() => window.__quantumPerf!);
  console.log('perf', JSON.stringify(perf));
  expect(perf.calls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('open an experiment, step through, return to the lab, and see visited marks', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await menu(page)
    .getByRole('button', { name: /Superposition/ })
    .click();
  await expect(page.getByRole('heading', { name: 'In two places at once' })).toBeFocused();
  await expect(page).toHaveURL(/#superposition$/);
  await expect(page.getByText('Experiment 2 of 4')).toBeVisible();

  await page.getByRole('button', { name: 'Next experiment' }).click();
  await expect(page.getByRole('heading', { name: 'The quantum bit' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous experiment' }).click();
  await expect(page.getByRole('heading', { name: 'In two places at once' })).toBeVisible();

  // The browser's Back button walks back through the experiments, then to the lab.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'The quantum bit' })).toBeVisible();
  await page.getByRole('button', { name: '← Back to lab' }).click();
  await expect(menu(page)).toBeVisible();
  await expect(menu(page).getByRole('button', { name: /Superposition/ })).toContainText('✓');
  await expect(menu(page).getByRole('button', { name: /Qubits/ })).toContainText('✓');
  await expect(menu(page).getByRole('button', { name: /Entanglement/ })).not.toContainText('✓');
  expect(errors).toEqual([]);
});

test('finishing all four shows the closing line', async ({ page }) => {
  await page.goto('/#basics');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next experiment' }).click();
  await page.getByRole('button', { name: 'Finish and return to the lab' }).click();
  await expect(page.getByText(/That's quantum physics: waves, mixes, qubits and links/)).toBeVisible();
});

test('learn more is closed by default and holds the equations', async ({ page }) => {
  await page.goto('/#superposition');
  const details = page.locator('details');
  await expect(details).not.toHaveAttribute('open');
  await expect(details.locator('.katex-display').first()).toBeHidden();
  await page.getByText('Learn more').click();
  await expect(details).toHaveAttribute('open');
  await expect(details.locator('.katex-display').first()).toBeVisible();
});

test('basics: the simulation loads, particles land, the slits can be watched', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#basics');
  const fire = card(page).getByRole('button', { name: 'Fire particles' });
  await expect(fire).toBeEnabled({ timeout: 60_000 });
  await setRange(page, 'Zoom', 1);
  await expect(card(page).locator('output')).toHaveText('0.1 nm: one atom');
  await fire.click();
  await expect(card(page).getByRole('button', { name: 'Stop firing' })).toBeVisible();
  await expect(page.getByText(/\d+ particles have landed/)).not.toHaveText(/^0 /, { timeout: 30_000 });
  const watch = card(page).getByRole('switch', { name: 'Watch the slits' });
  await watch.click();
  await expect(watch).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/Detectors watch the slits/)).toBeAttached();
  await page.screenshot({ path: 'test-results/basics.png' });
  expect(errors).toEqual([]);
});

test('superposition: looking finds the particle in one box; 100 looks follow the odds', async ({ page }) => {
  await page.goto('/#superposition');
  await card(page).getByRole('button', { name: 'Look', exact: true }).click();
  await expect(card(page).getByText(/Found in the (left|right) box/)).toBeVisible();

  // All the odds on the right: every look must find it there.
  await setRange(page, 'Left ↔ Right', 1);
  await expect(card(page).locator('output')).toHaveText('0% left · 100% right');
  await card(page).getByRole('button', { name: 'Look 100 times' }).click();
  await expect(card(page).getByText('Left box: 0 · Right box: 100')).toBeVisible();

  // An even mix: both boxes win sometimes (P(all 100 on one side) ≈ 1.6e-30).
  await setRange(page, 'Left ↔ Right', 0.5);
  await card(page).getByRole('button', { name: 'Look 100 times' }).click();
  const text = await card(page)
    .getByText(/Left box: \d+/)
    .innerText();
  const [left, right] = text.match(/\d+/g)!.map(Number);
  expect(left + right).toBe(100);
  expect(left).toBeGreaterThan(20);
  expect(right).toBeGreaterThan(20);
});

test('qubits: more qubits double the possibilities; measuring gives a bit string', async ({ page }) => {
  await page.goto('/#qubits');
  await setRange(page, 'Number of qubits', 3);
  await expect(card(page).locator('output').nth(1)).toHaveText('3 → 8 possibilities');
  await expect(card(page).getByText('000 001 010 011 100 101 110 111')).toBeAttached();
  await setRange(page, 'Mix of 0 and 1', 1);
  await card(page).getByRole('button', { name: 'Measure' }).click();
  await expect(card(page).getByText('Result:')).toContainText('111');
  await setRange(page, 'Mix of 0 and 1', 0);
  await card(page).getByRole('button', { name: 'Measure' }).click();
  await expect(card(page).getByText('Result:')).toContainText('000');
});

test('entanglement: every pair gives opposite results', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#entanglement');
  await card(page).getByRole('button', { name: 'Measure a pair' }).click();
  await expect(card(page).getByText(/Left: . (up|down) · Right: . (up|down)/)).toBeVisible({
    timeout: 20_000,
  });
  await card(page).getByRole('button', { name: 'Measure 100 pairs' }).click();
  await expect(card(page).getByText(/Opposite: 101 of 101/)).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('phones: the lab shows large tiles and the card is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tile = menu(page).getByRole('button', { name: /Qubits/ });
  const box = (await tile.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(70);
  await tile.click();
  const sheet = page.getByRole('region', { name: 'The quantum bit' });
  const sheetBox = (await sheet.boundingBox())!;
  expect(sheetBox.y + sheetBox.height).toBeGreaterThan(830);
  expect(sheetBox.width).toBeGreaterThan(380);
});

test('settings expose quality and motion controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByText('High', { exact: true }).click();
  await expect(dialog.getByRole('radio', { name: 'High' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Hebrew: the switch translates the lab, lays it out right to left and is remembered', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to Hebrew' }).click();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'he');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('פיזיקה קוונטית, בפשטות');

  await page
    .getByRole('navigation', { name: 'ניסויים' })
    .getByRole('button', { name: /קיוביטים/ })
    .click();
  const controls = page.getByRole('group', { name: 'פקדי הניסוי' });
  await controls.getByRole('button', { name: 'מדדו' }).click();
  await expect(controls.getByText('תוצאה:')).toBeVisible();
  // Equations stay left to right inside the Hebrew card.
  await page.getByText('לקריאה נוספת').click();
  await expect(page.locator('.katex-display').first().locator('xpath=..')).toHaveAttribute('dir', 'ltr');

  await page.reload();
  await expect(html).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'החלפה לאנגלית' }).click();
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'The quantum bit' })).toBeVisible();
  expect(errors).toEqual([]);
});
