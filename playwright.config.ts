import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production build, so they catch anything the unit tests miss:
 * routing, the real CodeMirror editor and real Pyodide from the CDN (so they need the network).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  /**
   * Bundled Chromium by default. Set PLAYWRIGHT_CHANNEL=chrome to use a Chrome already on the
   * machine instead, which saves the browser download. Each run starts with an empty browser
   * cache, so the mission test downloads Python (about 25 MB) every time.
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
