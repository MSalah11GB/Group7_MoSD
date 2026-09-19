import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';

export const artists = [
    { _id: 'a1', name: 'Keshi', image: 'a1.png', genres: ['g1'] },
    { _id: 'a2', name: 'Other Artist', image: 'a2.png', genres: [] },
];
export const albums = [
    { _id: 'al1', name: 'Skeletons', desc: 'd', image: 'al1.png', bgColor: '#222222' },
    { _id: 'al2', name: 'Second', desc: 'd', image: 'al2.png', bgColor: '#333333' },
];
export const genres = [
    { _id: 'g1', name: 'Pop', songCount: 1 },
    { _id: 'g2', name: 'Rock', songCount: 0 },
];
// Shaped like the real API: artists and genres arrive populated as objects.
export const songs = [
    {
        _id: 's1', name: 'Alpha', artist: [{ _id: 'a1', name: 'Keshi', image: 'a1.png' }], artistName: 'Keshi',
        album: 'Skeletons', albumId: 'al1', genres: [{ _id: 'g1', name: 'Pop' }],
        image: 's1.png', file: 'f1', duration: '3:05', lrcFile: '',
    },
];

/** Answers the admin's GET requests with the fixtures above unless overridden. */
export const mockApi = (overrides = {}) => {
    const data = { songs, albums, artists, genres, ...overrides };
    axios.get.mockImplementation(async (url) => {
        for (const [kind, field] of [['song', 'songs'], ['album', 'albums'], ['artist', 'artists'], ['genre', 'genres']]) {
            if (url.endsWith(`/api/${kind}/list`)) return { data: { success: true, [field]: data[field] } };
        }
        if (url.endsWith('/api/auth/me')) return { data: { success: true, ...data.me } };
        return { data: { success: true } };
    });
    axios.post.mockResolvedValue({ data: { success: true, message: 'ok' } });
};

export const renderPage = (ui, { route = '/', path = '*' } = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path={path} element={ui} />
                        <Route path='/list-song' element={<p>song list page</p>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        ),
    };
};

export const formValues = (formData, key) => formData.getAll(key);
