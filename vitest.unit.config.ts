import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node', // Environnement Node.js (pas besoin de jsdom pour les tests unitaires)
    globals: true,
    // Pas de setupFiles pour les tests unitaires simples
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/*.test.tsx', 'test/**/*.spec.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
