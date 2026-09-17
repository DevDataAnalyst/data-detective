import { defineConfig } from 'vitest/config';

/** Runs the Python checks in Pyodide under Node. Needs the internet the first time. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.pyodide.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
});
