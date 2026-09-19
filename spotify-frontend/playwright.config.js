import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;

// A well-formed but fake Clerk key: the tests block Clerk's network calls and browse anonymously.
const FAKE_CLERK_KEY = 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        viewport: { width: 1400, height: 900 },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        env: {
            VITE_CLERK_PUBLISHABLE_KEY: FAKE_CLERK_KEY,
            VITE_API_BASE_URL: 'http://localhost:4000',
        },
    },
});
