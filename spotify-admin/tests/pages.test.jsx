import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { toast } from 'react-toastify';
import AddSong from '../src/pages/AddSong.jsx';
import EditSong from '../src/pages/EditSong.jsx';
import ListSong from '../src/pages/ListSong.jsx';
import ListArtist from '../src/pages/ListArtist.jsx';
import { uploadToCloudinary } from '../src/utils/cloudinaryUpload.js';
import { mockApi, renderPage } from './helpers.jsx';

vi.mock('../src/utils/cloudinaryUpload.js', () => ({
    uploadToCloudinary: vi.fn(async (file, kind) => `musicify/${kind}/${file.name}`),
}));

beforeEach(() => {
    localStorage.clear();
    mockApi();
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

const file = (name, type) => new File(['x'], name, { type });
const chooseFile = (container, selector, f) => fireEvent.change(container.querySelector(selector), { target: { files: [f] } });
const postedForm = (endpoint) => axios.post.mock.calls.find(([url]) => url.endsWith(endpoint))?.[1];

describe('ListSong', () => {
    test('lists songs, searches on the server, and refreshes after deleting', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage(<ListSong />);

        expect(await screen.findByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Total: 1 songs')).toBeInTheDocument();

        await userEvent.type(screen.getByPlaceholderText(/search/i), 'alp{enter}');
        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/song\/list$/), { params: { search: 'alp' } })
        );

        const listCalls = () => axios.get.mock.calls.filter(([url]) => url.endsWith('/api/song/list')).length;
        const before = listCalls();
        fireEvent.click(screen.getByRole('button', { name: /delete|remove/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/song\/remove$/), { id: 's1' }));
        await waitFor(() => expect(listCalls()).toBeGreaterThan(before));
        expect(toast.success).toHaveBeenCalled();
    });

    test('does nothing when the delete confirmation is declined', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderPage(<ListSong />);
        await screen.findByText('Alpha');

        fireEvent.click(screen.getByRole('button', { name: /delete|remove/i }));
        expect(axios.post).not.toHaveBeenCalled();
    });
});

describe('ListArtist', () => {
    test('explains why an artist with songs cannot be deleted', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        axios.post.mockResolvedValue({ data: { success: false, hasSongs: true, songCount: 3, message: 'no' } });
        renderPage(<ListArtist />);
        await screen.findByText('Keshi');

        fireEvent.click(screen.getAllByRole('button', { name: /delete|remove/i })[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('3 song(s)')));
    });
});

describe('EditSong', () => {
    const open = () => renderPage(<EditSong />, { route: '/edit-song/s1', path: '/edit-song/:id' });

    test('starts from the song, turning populated artists and genres into ids', async () => {
        open();

        expect(await screen.findByDisplayValue('Alpha')).toBeInTheDocument();
        // The selected artist and genre show up as removable tags, already named (no blank tags while loading).
        expect(screen.getByText('Keshi', { selector: 'span' })).toBeInTheDocument();
        expect(screen.getByText('Pop', { selector: 'span' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Skeletons')).toBeInTheDocument();
    });

    test('saves ids (not "[object Object]") and uploads nothing when no file changed', async () => {
        open();
        await screen.findByDisplayValue('Alpha');

        await userEvent.clear(screen.getByDisplayValue('Alpha'));
        await userEvent.type(screen.getByPlaceholderText('Type Here'), 'Alpha (Remix)');
        fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }));

        await waitFor(() => expect(postedForm('/api/song/update')).toBeDefined());
        const form = postedForm('/api/song/update');

        expect(form.get('id')).toBe('s1');
        expect(form.get('name')).toBe('Alpha (Remix)');
        expect(form.getAll('artists')).toEqual(['a1']);
        expect(form.getAll('genres')).toEqual(['g1']);
        expect(form.get('albumId')).toBe('al1');
        expect(form.has('audioPublicId')).toBe(false);
        expect(form.has('imagePublicId')).toBe(false);
        expect(uploadToCloudinary).not.toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Song Updated');
    });

    test('uploads replaced files directly and sends only their ids', async () => {
        const { container } = open();
        await screen.findByDisplayValue('Alpha');

        chooseFile(container, '#song', file('new.mp3', 'audio/mpeg'));
        chooseFile(container, '#lrc', file('new.lrc', 'text/plain'));
        fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }));

        await waitFor(() => expect(postedForm('/api/song/update')).toBeDefined());
        const form = postedForm('/api/song/update');
        expect(form.get('audioPublicId')).toBe('musicify/audio/new.mp3');
        expect(form.get('lrcPublicId')).toBe('musicify/lrc/new.lrc');
        expect(form.get('audio')).toBeNull();
        expect(form.has('imagePublicId')).toBe(false);
    });

    test('shows the server\'s message when saving fails', async () => {
        axios.post.mockRejectedValue({ response: { data: { message: 'Album not found' } } });
        open();
        await screen.findByDisplayValue('Alpha');

        fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Album not found'));
    });

    test('redirects to the list when the song does not exist', async () => {
        renderPage(<EditSong />, { route: '/edit-song/nope', path: '/edit-song/:id' });

        expect(await screen.findByText('song list page')).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Song not found');
    });
});

describe('AddSong', () => {
    const selectOption = async (label, value) => {
        const select = screen.getAllByRole('combobox').find((el) => within(el).queryByText(label));
        await userEvent.selectOptions(select, value);
    };

    test('needs an audio file, an artist and an image before uploading anything', async () => {
        const { container } = renderPage(<AddSong />);
        await screen.findByText('Select Artist');

        await userEvent.type(screen.getByPlaceholderText('Type Here'), 'Draft');
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
        expect(toast.error).toHaveBeenLastCalledWith('Please upload an audio file');
        await userEvent.clear(screen.getByPlaceholderText('Type Here'));

        chooseFile(container, '#song', file('a.mp3', 'audio/mpeg'));
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
        expect(toast.error).toHaveBeenCalledTimes(1); // the browser itself blocks a submit without a name

        await userEvent.type(screen.getByPlaceholderText('Type Here'), 'New Song');
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
        expect(toast.error).toHaveBeenLastCalledWith('Please select at least one artist');

        await selectOption('Select Artist', 'a1');
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
        expect(toast.error).toHaveBeenLastCalledWith(expect.stringContaining('upload an image'));

        expect(uploadToCloudinary).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('uploads files directly and creates the song from their ids', async () => {
        const { container } = renderPage(<AddSong />);
        await screen.findByText('Select Artist');

        chooseFile(container, '#song', file('track.mp3', 'audio/mpeg'));
        chooseFile(container, '#image', file('cover.png', 'image/png'));
        await userEvent.type(screen.getByPlaceholderText('Type Here'), 'New Song');
        await selectOption('Select Artist', 'a1');
        await selectOption('Select Genre', 'g2');
        await selectOption('None', 'al2');
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

        await waitFor(() => expect(postedForm('/api/song/add')).toBeDefined());
        const form = postedForm('/api/song/add');

        expect(form.get('name')).toBe('New Song');
        expect(form.getAll('artists')).toEqual(['a1']);
        expect(form.getAll('genres')).toEqual(['g2']);
        expect(form.get('albumId')).toBe('al2');
        expect(form.get('audioPublicId')).toBe('musicify/audio/track.mp3');
        expect(form.get('imagePublicId')).toBe('musicify/image/cover.png');
        expect(form.get('audio')).toBeNull();
        expect(form.get('image')).toBeNull();
        expect(toast.success).toHaveBeenCalledWith('Song Added');
    });

    test('can use the album image instead of uploading one', async () => {
        const { container } = renderPage(<AddSong />);
        await screen.findByText('Select Artist');

        chooseFile(container, '#song', file('track.mp3', 'audio/mpeg'));
        await userEvent.type(screen.getByPlaceholderText('Type Here'), 'New Song');
        await selectOption('Select Artist', 'a1');
        await selectOption('None', 'al1');
        await userEvent.click(await screen.findByLabelText('Use album image for this song'));
        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

        await waitFor(() => expect(postedForm('/api/song/add')).toBeDefined());
        const form = postedForm('/api/song/add');
        expect(form.get('useAlbumImage')).toBe('true');
        expect(form.get('albumId')).toBe('al1');
        expect(form.has('imagePublicId')).toBe(false);
        expect(uploadToCloudinary).toHaveBeenCalledTimes(1); // audio only
    });

    test('fills the form from Spotify but still needs the audio file', async () => {
        axios.post.mockImplementation(async (url) =>
            url.endsWith('/api/song/spotify-metadata')
                ? { data: { success: true, track: { name: 'Blue', image: 'https://i.scdn.co/image/x', artists: [{ name: 'keshi' }, { name: 'Unknown Guy' }] } } }
                : { data: { success: true } }
        );
        renderPage(<AddSong />);
        await screen.findByText('Select Artist');

        await userEvent.type(screen.getByPlaceholderText(/open.spotify.com/), 'https://open.spotify.com/track/abc');
        fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

        expect(await screen.findByDisplayValue('Blue')).toBeInTheDocument();
        expect(screen.getByText('Keshi', { selector: 'span' })).toBeInTheDocument(); // matched case-insensitively
        expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Unknown Guy'));
        expect(screen.getByText('Using Spotify cover')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
        expect(toast.error).toHaveBeenLastCalledWith('Please upload an audio file');
    });

    test('a remembered album that no longer exists falls back to "none"', async () => {
        localStorage.setItem('addSong_album', 'Some Old Album Name');
        renderPage(<AddSong />);
        await screen.findByText('Select Artist');

        const albumSelect = screen.getAllByRole('combobox').find((el) => within(el).queryByText('None'));
        expect(albumSelect).toHaveValue('none');
    });
});
