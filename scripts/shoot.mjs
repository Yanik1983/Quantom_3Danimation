// Dev helper: screenshot the running app. Usage:
//   node scripts/shoot.mjs <baseUrl> <outDir> [lab|basics|superposition|qubits|entanglement ...] [--mobile]
// Env: WAIT ms before each shot, Q extra URL params (e.g. '&fx=0'), EVAL page JS run before each shot.
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4173', out = 'test-results/shots', ...rest] = process.argv.slice(2);
const mobile = rest.includes('--mobile');
const views = rest.filter((r) => !r.startsWith('--'));
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on(
  'console',
  (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`),
);
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(`${base}/?debug${process.env.Q ?? ''}`);
await page.waitForTimeout(2500);
for (const v of views.length ? views : ['lab']) {
  await page.evaluate((id) => {
    location.hash = id === 'lab' ? '' : id;
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, v);
  if (process.env.EVAL) {
    await page.waitForTimeout(2000);
    await page.evaluate(process.env.EVAL);
  }
  await page.waitForTimeout(Number(process.env.WAIT ?? 3500));
  const perf = await page.evaluate(() => window.__quantumPerf);
  console.log(`${v}:`, JSON.stringify(perf));
  await page.screenshot({ path: `${out}/${v}${mobile ? '-mobile' : ''}.png` });
}
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
