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

test('double slit: simulation completes, particles are detected, controls respond', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#double-slit');
  const status = page
    .getByRole('group', { name: 'Double-slit controls' })
    .getByRole('status')
    .filter({ hasText: 'Particles detected' });
  await expect(status).toBeVisible({ timeout: 45_000 });
  await page.getByRole('slider', { name: 'Emission rate' }).fill('100');
  await expect
    .poll(async () => Number((await status.textContent())?.replace(/\D/g, '') ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(20);
  const measure = page.getByRole('switch', { name: 'Measure which slit' });
  await measure.click();
  await expect(measure).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Reset double-slit experiment to defaults' }).click();
  await expect(measure).toHaveAttribute('aria-checked', 'false');
  await page.screenshot({ path: 'test-results/double-slit.png' });
  expect(errors).toEqual([]);
});

test('wavefunction: ψ stays normalized, phase edits and time evolution work', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#wavefunction');
  const group = page.getByRole('group', { name: 'Wavefunction controls' });
  const readout = group.getByRole('status', { name: 'Measured properties of ψ' });
  await expect(readout).toContainText('1.000', { timeout: 30_000 });
  await group.getByRole('slider', { name: 'Relative phase φ' }).fill('1');
  await expect(group.getByRole('slider', { name: 'Relative phase φ' })).toHaveAttribute(
    'aria-valuetext',
    '1.00π',
  );
  await expect(readout).toContainText('1.000');
  await group.getByRole('switch', { name: 'Evolve in time' }).click();
  await expect(readout).toContainText(/t = [1-9]/, { timeout: 30_000 });
  await expect(readout).toContainText('1.000');
  await group.getByRole('button', { name: 'Add a wave packet' }).click();
  await expect(group.getByRole('radio', { name: 'Packet C' })).toBeVisible();
  await group.getByRole('button', { name: 'Reset wavefunction to defaults' }).click();
  await expect(group.getByRole('radio', { name: 'Packet C' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('superposition: measurement collapses, repeats agree, tallies follow the Born rule', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#superposition');
  const group = page.getByRole('group', { name: 'Superposition controls' });
  await expect(group.getByRole('status', { name: 'Qubit state' })).toContainText('75.0%');
  await group.getByRole('button', { name: 'Measure', exact: true }).click();
  const result = group.getByText(/^Result: \|[01]⟩/);
  await expect(result).toBeVisible();
  const first = await result.textContent();
  for (let i = 0; i < 5; i++) {
    await group.getByRole('button', { name: 'Measure', exact: true }).click();
    await expect(result).toHaveText(first!);
  }
  await group.getByRole('button', { name: 'Measure 100 freshly prepared copies' }).click();
  const tally = group.getByText(/Tally for fresh copies/);
  await expect(tally).toContainText('Born rule: 75.0%');
  const counts = (await tally.textContent())!.match(/\|0⟩ (\d+) · \|1⟩ (\d+)/)!;
  expect(Number(counts[1]) + Number(counts[2])).toBe(101);
  await group.getByRole('radio', { name: /^X/ }).click();
  await expect(tally).toContainText('|+⟩ 0 · |−⟩ 0');
  expect(errors).toEqual([]);
});

test('orbitals: quantum-number selectors stay valid and readouts follow E = −13.6/n²', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#orbitals');
  const group = page.getByRole('group', { name: 'Orbital controls' });
  await expect(group).toContainText('3d');
  await expect(group).toContainText('−1.51 eV');
  await expect(group).toContainText(/95 % inside\s*\d/, { timeout: 30_000 });
  await group.getByRole('radiogroup', { name: 'Energy level n' }).getByRole('radio', { name: '1' }).click();
  await expect(group).toContainText('1s');
  await expect(group).toContainText('−13.61 eV');
  await expect(group.getByRole('radiogroup', { name: 'Shape l (subshell)' }).getByRole('radio')).toHaveCount(
    1,
  );
  await group.getByRole('radiogroup', { name: 'Energy level n' }).getByRole('radio', { name: '4' }).click();
  await group
    .getByRole('radiogroup', { name: 'Shape l (subshell)' })
    .getByRole('radio', { name: '3 · f' })
    .click();
  await expect(group.getByRole('radiogroup', { name: 'Orientation m' }).getByRole('radio')).toHaveCount(7);
  await expect(group).toContainText('0 radial · 3 angular');
  await group.getByRole('slider', { name: 'Cross-section' }).fill('0');
  await expect(group.getByRole('slider', { name: 'Cross-section' })).toHaveAttribute(
    'aria-valuetext',
    '50% cut away',
  );
  expect(errors).toEqual([]);
});

test('uncertainty: Gaussians saturate ℏ/2, squeezing trades Δx for Δp, other shapes exceed it', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#uncertainty');
  const group = page.getByRole('group', { name: 'Uncertainty controls' });
  const readout = group.getByRole('status', { name: 'Uncertainty readout' });
  await expect(readout).toContainText('Δx·Δp = 0.500ℏ');
  await expect(readout).toContainText('Δx = 1.000');
  await group.getByRole('slider', { name: 'Squeeze position (width)' }).fill('0');
  await expect(readout).toContainText('Δx = 0.250');
  await expect(readout).toContainText('Δp = 2.000ℏ');
  await expect(readout).toContainText('Δx·Δp = 0.500ℏ');
  await group.getByRole('radio', { name: 'Two peaks' }).click();
  await expect(group.getByRole('slider', { name: 'Peak separation' })).toBeVisible();
  await expect(readout).toContainText('above the limit');
  await group.getByRole('button', { name: 'Reset uncertainty demo to defaults' }).click();
  await expect(readout).toContainText('minimum-uncertainty state');
  expect(errors).toEqual([]);
});

test('tunneling: a full run ends with measured transmission matching the quantum prediction', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#tunneling');
  const group = page.getByRole('group', { name: 'Tunneling controls' });
  await group.getByRole('switch', { name: 'Auto-repeat' }).click();
  const readout = group.getByRole('status', { name: 'Transmission readout' });
  await expect(readout).toContainText(/Classical: \d/);
  await expect(readout).toContainText('Final:', { timeout: 100_000 });
  const text = (await readout.textContent())!;
  const [, measured, predicted] = text.match(/Final: measured ([\d.]+)% vs predicted ([\d.]+)%/)!;
  expect(Math.abs(Number(measured) - Number(predicted))).toBeLessThan(1);
  expect(Number(measured)).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('entanglement: Bell counter shows the quantum match rate below the classical minimum', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#entanglement');
  const group = page.getByRole('group', { name: 'Entanglement controls' });
  await group.getByRole('slider', { name: 'Pairs per second' }).fill('100');
  const counter = group.getByRole('status', { name: 'Bell test counter' });
  // ≥ 2000 pairs: the quantum/classical gap (0.056) is then ≈ 3.5 standard errors.
  await expect
    .poll(
      async () =>
        Number((await counter.textContent())!.match(/([\d,]+) pairs measured/)![1].replace(/,/g, '')),
      {
        timeout: 70_000,
      },
    )
    .toBeGreaterThanOrEqual(2000);
  const text = (await counter.textContent())!;
  const [, q] = text.match(/entangled pairs([\d.]+) ±/)!;
  const [, c] = text.match(/hidden-instruction model([\d.]+) ±/)!;
  expect(Number(q)).toBeLessThan(Number(c));
  await group.getByRole('radio', { name: /CHSH/ }).click();
  await expect(counter).toContainText('|S| — entangled pairs');
  await expect(group.getByRole('img', { name: /Correlation between Alice/ })).toBeVisible();
  expect(errors).toEqual([]);
});
