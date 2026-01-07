import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Simule un navigateur
    globals: true, // Permet d'utiliser describe, it, expect sans import
    setupFiles: [path.resolve(__dirname, './test/setup.ts')], // Fichier d'initialisation avec chemin absolu
    include: ['test/**/*.test.ts'], // Inclure tous les fichiers de test
    typecheck: {
      tsconfig: './tsconfig.test.json', // Utiliser une config TypeScript spécifique pour les tests
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});


