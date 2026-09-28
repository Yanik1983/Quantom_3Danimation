// Dev helper: screenshot the running app at given stations. Usage:
//   node scripts/shoot.mjs <baseUrl> <outDir> [station ...] [--mobile]
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4173', out = 'test-results/shots', ...rest] = process.argv.slice(2);
const mobile = rest.includes('--mobile');
const stations = rest.filter((r) => !r.startsWith('--')).map(Number);
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
for (const s of stations.length ? stations : [0]) {
  await page.evaluate((st) => {
    const el = document.querySelector(`[data-station="${st}"]`);
    const y = el.getBoundingClientRect().top + window.scrollY + (st === 0 ? 0 : el.offsetHeight * 0.02);
    window.scrollTo({ top: y, behavior: 'instant' });
  }, s);
  if (process.env.EVAL) await page.evaluate(process.env.EVAL);
  await page.waitForTimeout(Number(process.env.WAIT ?? 3500));
  const perf = await page.evaluate(() => window.__quantumPerf);
  console.log(`station ${s}:`, JSON.stringify(perf));
  await page.screenshot({ path: `${out}/station-${s}${mobile ? '-mobile' : ''}.png` });
}
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
