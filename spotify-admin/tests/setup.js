import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Registered on this package's own expect: jest-dom/vitest would attach to another workspace's vitest copy.
expect.extend(matchers);

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
    ToastContainer: () => null,
}));

// jsdom has no object URLs; the forms use them for image previews.
URL.createObjectURL = vi.fn(() => 'blob:preview');

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
