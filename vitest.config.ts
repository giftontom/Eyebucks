import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**.config.{js,ts}',
        '**/dist/**',
        // Entry point — not unit-testable
        'index.tsx',
        // Complex media components — require browser APIs not available in jsdom
        'components/VideoUploader.tsx',
        'components/VideoPlayer.tsx',
        // Admin pages — integration-level, no unit test value over page tests
        'pages/admin/**',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
