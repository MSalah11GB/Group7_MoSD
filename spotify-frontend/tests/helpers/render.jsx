import { vi } from 'vitest';
import axios from 'axios';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlayerProvider from '../../src/context/PlayerProvider.jsx';
import PlaylistProvider from '../../src/context/PlaylistProvider.jsx';
import { albums, artists, genres, songs } from './fixtures.js';

export const apiError = (status, message) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { success: false, message } },
    });

/**
 * Answers the app's GET requests from `data` (or throws the given error). Anything not listed
 * responds with an empty success so unrelated calls don't fail a test.
 */
export const mockApi = ({ playlists = [], playlistById = {}, ...overrides } = {}) => {
    const data = { songs, albums, artists, genres, ...overrides };

    axios.get.mockImplementation(async (url, config = {}) => {
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        const respond = (value) => (value instanceof Error ? Promise.reject(value) : { data: { success: true, ...value } });

        if (path === '/api/song/list') return respond(data.songs instanceof Error ? data.songs : { songs: data.songs });
        if (path === '/api/album/list') return respond({ albums: data.albums });
        if (path === '/api/artist/list') return respond({ artists: data.artists });
        if (path === '/api/genre/list') return respond({ genres: data.genres });
        if (path === '/api/playlist/list') return respond({ playlists });
        if (path === '/api/playlist/get') {
            const found = playlistById[config.params?.id];
            return respond(found instanceof Error ? found : { playlist: found });
        }
        return { data: { success: true } };
    });
    axios.post.mockResolvedValue({ data: { success: true } });
};

export const renderWithProviders = (ui, { route = '/' } = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[route]}>
                    <PlayerProvider>
                        <PlaylistProvider>{ui}</PlaylistProvider>
                    </PlayerProvider>
                </MemoryRouter>
            </QueryClientProvider>
        ),
    };
};

/** jsdom doesn't implement media playback; this fakes play/pause including their events. */
export const installFakeAudio = () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() {
        Object.defineProperty(this, 'paused', { value: false, configurable: true });
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() {
        Object.defineProperty(this, 'paused', { value: true, configurable: true });
        this.dispatchEvent(new Event('pause'));
    });
};
