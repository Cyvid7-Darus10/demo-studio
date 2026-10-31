import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'server/**/*.test.mjs', 'shared/**/*.test.mjs'], environment: 'node' },
});
