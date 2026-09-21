// vitest.config.js — Context Copilot test configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    globals: true,
    // Chrome extension APIs will be mocked per-test via setup files
    setupFiles: ['tests/setup.js'],
  },
});
