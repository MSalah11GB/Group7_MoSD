import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    env: {
      NODE_ENV: 'test',
      ADMIN_USER_IDS: 'env_admin',
      CLOUDINARY_NAME: 'testcloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_SECRET_KEY: 'test-secret',
      CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',
    },
  },
});
