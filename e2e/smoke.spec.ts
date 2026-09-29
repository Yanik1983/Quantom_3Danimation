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
const menu = (page: Page) => page.getByRole('navigation', { name: 'Steps' });

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

test('the lab boots, renders WebGL, states the goal and offers four steps', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How does a quantum computer work?');
  await expect(page.getByText(/find a hidden card in one look/)).toBeVisible();
  await expect(menu(page).getByRole('button')).toHaveText([
    /Waves that cancel/,
    /Qubits: 0 and 1 at once/,
    /Linked qubits/,
    /Find the card/,
  ]);
  await page.waitForFunction(() => !!window.__quantumPerf, undefined, { timeout: 20_000 });
  const perf = await page.evaluate(() => window.__quantumPerf!);
  console.log('perf', JSON.stringify(perf));
  expect(perf.calls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Start opens step 1; Next names the next step; Back returns to the lab with visited marks', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Can a particle act like a wave?' })).toBeFocused();
  await expect(page).toHaveURL(/#basics$/);
  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await expect(page.getByText('Try it')).toBeVisible();

  await page.getByRole('button', { name: 'Next: Qubits: 0 and 1 at once' }).click();
  await expect(page.getByRole('heading', { name: 'Can a bit be 0 and 1 at once?' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous step' }).click();
  await expect(page.getByRole('heading', { name: 'Can a particle act like a wave?' })).toBeVisible();

  // The browser's Back button walks back through the steps, then to the lab.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Can a bit be 0 and 1 at once?' })).toBeVisible();
  await page.getByRole('button', { name: '← Back to lab' }).click();
  await expect(menu(page)).toBeVisible();
  await expect(menu(page).getByRole('button', { name: /Waves that cancel/ })).toContainText('✓');
  await expect(menu(page).getByRole('button', { name: /Qubits/ })).toContainText('✓');
  await expect(menu(page).getByRole('button', { name: /Linked qubits/ })).not.toContainText('✓');
  expect(errors).toEqual([]);
});

test('finishing step 4 opens the finale, which leads to the real machine', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#basics');
  for (const name of ['Qubits: 0 and 1 at once', 'Linked qubits', 'Find the card'])
    await page.getByRole('button', { name: `Next: ${name}` }).click();
  await page.getByRole('button', { name: 'Finish and see what you learned' }).click();
  await expect(
    page.getByRole('heading', { name: 'Now you know how a quantum computer works' }),
  ).toBeFocused();
  await expect(page).toHaveURL(/#finale$/);
  await expect(page.getByText(/They will not replace your phone/)).toBeVisible();
  await page.getByRole('button', { name: 'Meet the real machine' }).click();
  await expect(page.getByRole('heading', { name: 'A real quantum computer' })).toBeFocused();
  await expect(page).toHaveURL(/#computer$/);
  await expect(page.getByText(/colder than outer space/)).toBeVisible();
  await page.getByRole('button', { name: '← Back to lab' }).click();
  // All four done: the lab offers the summary again.
  await expect(page.getByRole('button', { name: 'What you learned' })).toBeVisible();
  await page.goto('/#computer');
  await expect(page.getByRole('heading', { name: 'A real quantum computer' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('each step says how a quantum computer uses it', async ({ page }) => {
  await page.goto('/#qubits');
  await expect(page.getByText('In the quantum computer')).toBeVisible();
  await expect(page.getByText(/one result, at random/)).toBeVisible();
});

test('find the card: you lift cups first, then Grover search finds it in one look', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#search');
  const controls = card(page);
  for (const cup of ['00', '01', '10', '11']) {
    const lift = controls.getByRole('button', { name: `Lift cup ${cup}` });
    if (await lift.isEnabled()) await lift.click();
  }
  await expect(controls.getByText(/Found on try [1-4]!/)).toBeVisible();
  await controls.getByRole('button', { name: 'Now let the quantum computer try' }).click();
  await expect(controls.getByText(/The 2 qubits start at 00/)).toBeVisible();
  await controls.getByRole('button', { name: 'Step 1: Spread' }).click();
  await expect(controls.getByText(/Each cup has a 25% chance/)).toBeVisible();
  await controls.getByRole('button', { name: 'Step 2: Mark' }).click();
  await expect(controls.getByText(/Its chance is still 25%/)).toBeVisible();
  await controls.getByRole('button', { name: 'Step 3: Cancel' }).click();
  await expect(controls.getByText(/grows to 100%/)).toBeVisible();
  await controls.getByRole('button', { name: 'Step 4: Measure' }).click();
  await expect(controls.getByText(/Found under cup (00|01|10|11) in one look/)).toBeVisible();
  await controls.getByRole('button', { name: 'Hide a new card' }).click();
  await expect(controls.getByRole('button', { name: 'Step 1: Spread' })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('learn more is closed by default and holds the equations', async ({ page }) => {
  await page.goto('/#qubits');
  const details = page.locator('details');
  await expect(details).not.toHaveAttribute('open');
  await expect(details.locator('.katex-display').first()).toBeHidden();
  await page.getByText('Learn more').click();
  await expect(details).toHaveAttribute('open');
  await expect(details.locator('.katex-display').first()).toBeVisible();
});

test('waves: the simulation loads, particles land, the detectors can be switched on', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#basics');
  const fire = card(page).getByRole('button', { name: 'Fire', exact: true });
  await expect(fire).toBeEnabled({ timeout: 60_000 });
  await fire.click();
  await expect(card(page).getByRole('button', { name: 'Stop firing' })).toBeVisible();
  await expect(page.getByText(/\d+ particles have landed/)).not.toHaveText(/^0 /, { timeout: 30_000 });
  await expect(card(page).getByText('What you saw')).toBeVisible();
  const detectors = card(page).getByRole('switch', { name: 'Detectors on the slits' });
  await detectors.click();
  await expect(detectors).toHaveAttribute('aria-checked', 'true');
  await expect(card(page).getByText(/The detectors (will )?record which slit/)).toBeVisible();
  await page.screenshot({ path: 'test-results/basics.png' });
  expect(errors).toEqual([]);
});

test('qubits: measuring follows the mix; more qubits double the results', async ({ page }) => {
  await page.goto('/#qubits');
  await card(page).getByRole('button', { name: 'Measure', exact: true }).click();
  await expect(card(page).getByText(/Result: [01]\. The cloud is gone/)).toBeVisible();

  // All the chance on 1: every measurement must give 1.
  await setRange(page, 'Mix of 0 and 1', 1);
  await expect(card(page).locator('output').first()).toHaveText('0% 0 · 100% 1');
  await card(page).getByRole('button', { name: 'Measure 100 times' }).click();
  await expect(
    card(page).getByText('0 came up 0 times and 1 came up 100 times', { exact: false }),
  ).toBeVisible();

  // An even mix: both results come up (P(all 100 the same) ≈ 1.6e-30).
  await setRange(page, 'Mix of 0 and 1', 0.5);
  await card(page).getByRole('button', { name: 'Measure 100 times' }).click();
  const text = await card(page)
    .getByText(/0 came up \d+ times/)
    .innerText();
  const [, zeros, ones] = text.match(/0 came up (\d+) times and 1 came up (\d+) times/)!.map(Number);
  expect(zeros + ones).toBe(100);
  expect(zeros).toBeGreaterThan(20);
  expect(ones).toBeGreaterThan(20);

  const add = card(page).getByRole('button', { name: 'Add a qubit' });
  await add.click();
  await add.click();
  await expect(card(page).getByText('3 → 8 possible results')).toBeVisible();
  await expect(card(page).getByText('000 001 010 011 100 101 110 111')).toBeAttached();
  await expect(card(page).getByText(/3 qubits make a mix of 8 possible results/)).toBeVisible();
  await setRange(page, 'Mix of 0 and 1', 1);
  await card(page).getByRole('button', { name: 'Measure', exact: true }).click();
  await expect(card(page).getByText(/Result: 111\./)).toBeVisible();
});

test('linked qubits: every pair gives the same bit, each one random', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#entanglement');
  await card(page).getByRole('button', { name: 'Measure a pair' }).click();
  await expect(card(page).getByText(/Left: ([01]) · Right: \1\. The same!/)).toBeVisible({ timeout: 20_000 });
  await card(page).getByRole('button', { name: 'Measure 100 pairs' }).click();
  await expect(card(page).getByText(/101 of 101 pairs matched/)).toBeVisible({ timeout: 60_000 });
  await expect(card(page).getByText(/pair of gloves/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('phones: the lab shows large tiles and the card is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tile = menu(page).getByRole('button', { name: /Qubits/ });
  const box = (await tile.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(70);
  await tile.click();
  const sheet = page.getByRole('region', { name: 'Can a bit be 0 and 1 at once?' });
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('איך עובד מחשב קוונטי?');

  await page
    .getByRole('navigation', { name: 'שלבים' })
    .getByRole('button', { name: /קיוביטים: 0/ })
    .click();
  const controls = page.getByRole('group', { name: 'פקדי הניסוי' });
  await controls.getByRole('button', { name: 'מדדו', exact: true }).click();
  await expect(controls.getByText(/תוצאה:/)).toBeVisible();
  // Equations stay left to right inside the Hebrew card.
  await page.getByText('לקריאה נוספת').click();
  await expect(page.locator('.katex-display').first().locator('xpath=..')).toHaveAttribute('dir', 'ltr');

  await page.reload();
  await expect(html).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'החלפה לאנגלית' }).click();
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'Can a bit be 0 and 1 at once?' })).toBeVisible();
  expect(errors).toEqual([]);
});
