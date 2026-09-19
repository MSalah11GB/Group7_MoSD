import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { setTestUser } from './helpers/clerkMock.jsx';
import { installFakeAudio, mockApi, renderWithProviders, apiError } from './helpers/render.jsx';
import { playlist } from './helpers/fixtures.js';
import axios from 'axios';

beforeEach(() => {
    installFakeAudio();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

// The player at the bottom also shows the current song, so page content is queried inside <main>.
const page = () => within(screen.getByRole('main'));

const renderApp = async (route = '/', apiOptions) => {
    mockApi(apiOptions);
    const utils = renderWithProviders(<App />, { route });
    await waitFor(() => expect(screen.queryByText('Loading music...')).not.toBeInTheDocument());
    return utils;
};

describe('app shell', () => {
    test('shows a loading state, then the home page', async () => {
        mockApi();
        renderWithProviders(<App />);
        expect(screen.getByText('Loading music...')).toBeInTheDocument();

        expect(await screen.findByText('Featured Charts')).toBeInTheDocument();
        expect(page().getByText('Skeletons')).toBeInTheDocument();
        expect(screen.getByText("Today's biggest hits")).toBeInTheDocument();
        expect(page().getByText('Alpha')).toBeInTheDocument();
        expect(page().getByText('Gamma')).toBeInTheDocument();
    });

    test('shows an error with a retry button instead of a blank page', async () => {
        mockApi({ songs: apiError(500, 'boom') });
        renderWithProviders(<App />);

        expect(await screen.findByText("Couldn't load the music library")).toBeInTheDocument();

        mockApi();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('Featured Charts')).toBeInTheDocument();
    });

    test('shows a friendly message when the library is empty', async () => {
        await renderApp('/', { songs: [], albums: [] });
        expect(screen.getByText('No music yet')).toBeInTheDocument();
        expect(screen.queryByText('Featured Charts')).not.toBeInTheDocument();
    });

    test('unknown routes show a not-found message', async () => {
        await renderApp('/nowhere');
        expect(screen.getByText('Page not found')).toBeInTheDocument();
    });

    test('genre pills on the home page filter the songs', async () => {
        await renderApp();
        fireEvent.click(page().getByText('Rock'));

        expect(page().queryByText('Alpha')).not.toBeInTheDocument();
        expect(page().getByText('Beta')).toBeInTheDocument();
        expect(page().getByText('Gamma')).toBeInTheDocument();
    });
});

describe('browse pages', () => {
    test('artist page lists the artist\'s songs even though the API returns populated artist objects', async () => {
        await renderApp('/artist/a1');

        expect(page().getByRole('heading', { name: 'Keshi' })).toBeInTheDocument();
        expect(page().getByText(/• 2 songs/)).toBeInTheDocument();
        expect(page().getByRole('heading', { name: 'Singles' })).toBeInTheDocument();
        expect(page().getByRole('heading', { name: 'Skeletons' })).toBeInTheDocument();
        expect(page().getByText('Alpha')).toBeInTheDocument();
        expect(page().getByText('Beta')).toBeInTheDocument();
        expect(page().queryByText('Gamma')).not.toBeInTheDocument();
    });

    test('album page lists the songs that reference the album', async () => {
        await renderApp('/album/al1');

        expect(page().getByRole('heading', { name: 'Skeletons' })).toBeInTheDocument();
        expect(page().getByText('1 song,')).toBeInTheDocument();
        expect(page().getByText('Alpha')).toBeInTheDocument();
        expect(page().queryByText('Beta')).not.toBeInTheDocument();
    });

    test('genre page groups songs by artist', async () => {
        await renderApp('/genre/g2');

        expect(page().getByRole('heading', { name: 'Rock' })).toBeInTheDocument();
        expect(page().getByText(/• 2 songs/)).toBeInTheDocument();
        expect(page().getByRole('heading', { name: 'Keshi' })).toBeInTheDocument();
        expect(page().getByRole('heading', { name: 'Other Artist' })).toBeInTheDocument();
    });

    test.each([
        ['/album/missing', 'Album not found'],
        ['/artist/missing', 'Artist not found'],
        ['/genre/missing', 'Genre not found'],
    ])('%s says it was not found', async (route, message) => {
        await renderApp(route);
        expect(screen.getByText(message)).toBeInTheDocument();
    });

    test('clicking a song plays it and the player shows it', async () => {
        await renderApp('/genre/g2');

        const row = page().getByText('Gamma').closest('div[class*="grid"]');
        fireEvent.click(row);

        await waitFor(() => expect(screen.getByAltText('S')).toBeInTheDocument()); // pause button = playing
        expect(document.querySelector('audio')).toHaveAttribute('src', 'https://cdn.test/s3.mp3');
        expect(screen.getAllByText('Gamma').length).toBeGreaterThan(1); // list row + player
    });
});

describe('search', () => {
    test('finds songs and albums from the library as you type', async () => {
        await renderApp();
        const user = userEvent.setup();

        await user.click(screen.getByText('Search'));
        const box = await screen.findByPlaceholderText(/Search songs/);

        await user.type(box, 'gam');
        // Gamma is on the home page's song card and now also in the search results dropdown.
        expect(await screen.findAllByText('Gamma')).toHaveLength(2);

        await user.clear(box);
        await user.type(box, 'skel');
        expect(await screen.findByText(/Album/)).toBeInTheDocument();

        await user.clear(box);
        await user.type(box, 'zzzz');
        expect(await screen.findByText('No results found')).toBeInTheDocument();
    });
});

describe('playlists', () => {
    const owner = { id: 'user_1', fullName: 'Test User' };

    test('the owner sees remove buttons and their playlist in the sidebar', async () => {
        setTestUser(owner);
        const mine = playlist();
        await renderApp('/playlist/p1', { playlists: [mine], playlistById: { p1: mine } });

        expect(await screen.findByRole('heading', { name: 'My Mix' })).toBeInTheDocument();
        expect(screen.getByText('2 songs')).toBeInTheDocument();
        expect(screen.getAllByTitle('Remove from playlist')).toHaveLength(2);
        expect(screen.getByTitle('Add songs to playlist')).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Open playlist: My Mix' })).toBeInTheDocument();
    });

    test('other people see a public playlist without edit controls', async () => {
        setTestUser({ id: 'user_2', fullName: 'Someone Else' });
        const theirs = playlist();
        await renderApp('/playlist/p1', { playlists: [theirs], playlistById: { p1: theirs } });

        expect(await screen.findByRole('heading', { name: 'My Mix' })).toBeInTheDocument();
        expect(screen.queryByTitle('Remove from playlist')).not.toBeInTheDocument();
    });

    test('a private playlist you cannot see shows the server\'s reason, not a generic failure', async () => {
        await renderApp('/playlist/p9', { playlistById: { p9: apiError(403, 'This playlist is private') } });

        expect(await screen.findByText('Playlist Not Found')).toBeInTheDocument();
        expect(screen.getByText(/This playlist is private/)).toBeInTheDocument();
    });

    test('removing a song updates the list immediately and tells the server', async () => {
        setTestUser(owner);
        const mine = playlist();
        await renderApp('/playlist/p1', { playlists: [mine], playlistById: { p1: mine } });
        await screen.findByRole('heading', { name: 'My Mix' });

        fireEvent.click(screen.getAllByTitle('Remove from playlist')[0]);

        await waitFor(() => expect(screen.getAllByTitle('Remove from playlist')).toHaveLength(1));
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/playlist/remove-song'), {
            playlistId: 'p1',
            songId: 's1',
        });
    });
});
