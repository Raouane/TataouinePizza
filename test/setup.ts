import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Nettoie après chaque test (évite les fuites de mémoire)
afterEach(() => {
  cleanup();
  localStorage.clear();
});


