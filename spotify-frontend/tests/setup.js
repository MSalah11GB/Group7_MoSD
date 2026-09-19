import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setTestUser } from './helpers/clerkMock.jsx';

// Registered on this package's own expect: jest-dom/vitest would attach to the backend's vitest copy in the workspace.
expect.extend(matchers);

vi.mock('@clerk/clerk-react', async () => (await import('./helpers/clerkMock.jsx')).clerkMock);

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() } },
    },
}));

afterEach(() => {
    cleanup();
    setTestUser(null);
    vi.restoreAllMocks();
});
