import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { attachToken, setTokenGetter } from '../src/config/authToken.js';
import { API_BASE_URL } from '../src/config/api.js';

const apiRequest = (path = '/api/song/list') => ({ url: `${API_BASE_URL}${path}`, headers: {} });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    setTokenGetter(null);
});

describe('attachToken', () => {
    test('adds the Clerk token to requests to our API', async () => {
        setTokenGetter(async () => 'tok123');
        const config = await attachToken(apiRequest());
        expect(config.headers.Authorization).toBe('Bearer tok123');
    });

    test('sends no header when signed out, without waiting', async () => {
        setTokenGetter(null);
        const config = await attachToken(apiRequest());
        expect(config.headers.Authorization).toBeUndefined();
    });

    test('never sends the token to other hosts', async () => {
        setTokenGetter(async () => 'tok123');
        const config = await attachToken({ url: 'https://res.cloudinary.com/x.png', headers: {} });
        expect(config.headers.Authorization).toBeUndefined();
    });

    test('a Clerk that never answers cannot block requests forever', async () => {
        setTokenGetter(() => new Promise(() => {}));
        const pending = attachToken(apiRequest());

        await vi.advanceTimersByTimeAsync(3100);
        const config = await pending;
        expect(config.headers.Authorization).toBeUndefined();
    });

    test('a failing token lookup falls back to an anonymous request', async () => {
        setTokenGetter(async () => {
            throw new Error('not signed in');
        });
        const config = await attachToken(apiRequest());
        expect(config.headers.Authorization).toBeUndefined();
    });
});
