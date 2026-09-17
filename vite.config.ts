/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    // Module workers let the Python worker import Pyodide from the CDN at runtime.
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Pyodide tests download packages, so they run separately with npm run test:python.
    exclude: ['src/**/*.pyodide.test.ts', 'node_modules/**'],
  },
});
