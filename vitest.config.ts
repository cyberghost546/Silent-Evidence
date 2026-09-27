import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Run test FILES one at a time. Several suites are integration tests that hit
    // the same MariaDB, and others mock '@/lib/prisma'. Running them in parallel
    // let a mocked prisma leak into a real-DB suite and let many PrismaClients
    // contend on the same database — both intermittent, both nothing to do with
    // the code under test. Sequential files make the suite deterministic. Tests
    // within a file still run normally.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/api/**/*.ts', 'lib/**/*.ts'],
      exclude: ['lib/prisma.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
