import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearSession } from '../src/api/session';

// Per-test isolation: the console keeps a token pair in MODULE MEMORY (api/session.ts), so a test
// that signs in would otherwise leak its session into the next one — exactly the bug this file
// exists to prevent.
beforeEach(() => {
  window.sessionStorage.clear();
  clearSession();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  clearSession();
});
