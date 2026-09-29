import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Headless Chromium renders WebGL in software (hundreds of ms per frame with the full lab), which can delay
  // React updates; give assertions more time than the 5 s default.
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
