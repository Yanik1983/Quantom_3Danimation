/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  server: { host: true, port: 5173 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
