// Global Vitest setup — runs before every test file.
// Resets all mocks between tests so state never leaks across test cases.
import { vi, afterEach } from 'vitest';

// Deterministic test-only environment. Routes that sign session cookies refuse to
// run without a SESSION_SECRET of at least 32 characters, so supply a dummy one
// here — otherwise auth tests get a 500 instead of exercising the real logic.
// These are fakes: never point them at anything real.
// (Vitest already sets NODE_ENV=test, and its type is read-only, so leave it alone.)
process.env.SESSION_SECRET ??= 'test-session-secret-at-least-32-chars-long';

afterEach(() => {
  vi.resetAllMocks();
});
