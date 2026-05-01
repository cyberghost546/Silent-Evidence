// Global Vitest setup — runs before every test file.
// Resets all mocks between tests so state never leaks across test cases.
import { vi, afterEach } from 'vitest';

afterEach(() => {
  vi.resetAllMocks();
});
