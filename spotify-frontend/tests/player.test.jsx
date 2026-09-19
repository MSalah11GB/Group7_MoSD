import { useContext, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { PlayerContext } from '../src/context/PlayerContext.js';
import { installFakeAudio, mockApi, renderWithProviders, apiError } from './helpers/render.jsx';
import { songs } from './helpers/fixtures.js';

// `player` always reads the latest context value captured by the mounted component.
const captured = { current: null };
const player = new Proxy({}, { get: (_, key) => captured.current[key] });
const Capture = () => {
    const value = useContext(PlayerContext);
    useEffect(() => {
        captured.current = value;
    });
    return null;
};

const audioEl = () => document.querySelector('audio');
const finishTrack = () => act(() => audioEl().dispatchEvent(new Event('ended')));

const setup = async (apiOptions) => {
    mockApi(apiOptions);
    renderWithProviders(<Capture />);
    await waitFor(() => expect(player.libraryStatus.isLoading).toBe(false));
};

beforeEach(() => {
    installFakeAudio();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '[00:01.00]Hello\n[00:05.00]World' })));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loading the library', () => {
    test('exposes the catalog and preselects the first song without playing it', async () => {
        await setup();

        expect(player.songsData).toHaveLength(3);
        expect(player.albumsData).toHaveLength(1);
        expect(player.track._id).toBe('s1');
        expect(player.playStatus).toBe(false);
        expect(audioEl()).toHaveAttribute('src', 'https://cdn.test/s1.mp3');
        expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    });

    test('reports an error instead of hanging, and can retry', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mockApi({ songs: apiError(500, 'boom') });
        renderWithProviders(<Capture />);

        await waitFor(() => expect(player.libraryStatus.isError).toBe(true));

        mockApi();
        await act(() => player.libraryStatus.refetch());
        await waitFor(() => expect(player.libraryStatus.isError).toBe(false));
        expect(player.songsData).toHaveLength(3);
    });

    test('an empty library has no track and does not break', async () => {
        await setup({ songs: [], albums: [] });

        expect(player.track).toBeNull();
        expect(player.songsData).toEqual([]);
        await act(() => player.play());
        expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    });
});

describe('playing songs', () => {
    test('playWithId switches the track, starts playback and remembers the previous song', async () => {
        await setup();

        await act(() => player.playWithId('s2'));

        await waitFor(() => expect(player.playStatus).toBe(true));
        expect(player.track._id).toBe('s2');
        expect(audioEl()).toHaveAttribute('src', 'https://cdn.test/s2.mp3');
        expect(player.history).toEqual(['s1']);
    });

    test('playing the current song again resumes instead of restarting or adding history', async () => {
        await setup();
        await act(() => player.playWithId('s2'));
        await waitFor(() => expect(player.playStatus).toBe(true));

        act(() => player.pause());
        expect(player.playStatus).toBe(false);

        await act(() => player.playWithId('s2'));
        expect(player.playStatus).toBe(true);
        expect(player.history).toEqual(['s1']);
    });

    test('unknown ids are ignored', async () => {
        await setup();
        await act(() => player.playWithId('nope'));
        expect(player.track._id).toBe('s1');
    });

    test('previousSong goes back through history without re-adding the current song', async () => {
        await setup();
        await act(() => player.playWithId('s2'));
        await act(() => player.playWithId('s3'));
        expect(player.history).toEqual(['s1', 's2']);

        act(() => player.previousSong());
        expect(player.track._id).toBe('s2');
        expect(player.history).toEqual(['s1']);

        act(() => player.previousSong());
        expect(player.track._id).toBe('s1');
        expect(player.history).toEqual([]);

        act(() => player.previousSong());
        expect(player.track._id).toBe('s1');
    });
});

describe('queue', () => {
    test('nextSong plays queued songs in order and consumes them', async () => {
        await setup();
        act(() => {
            player.addToQueue('s3');
            player.addToQueue('s2');
        });
        expect(player.queue).toEqual(['s3', 's2']);

        act(() => player.nextSong());
        expect(player.track._id).toBe('s3');
        expect(player.queue).toEqual(['s2']);
        expect(player.history).toEqual(['s1']);
    });

    test('nextSong with an empty queue does nothing', async () => {
        await setup();
        act(() => player.nextSong());
        expect(player.track._id).toBe('s1');
    });

    test('playFromQueueAt plays that entry and removes only it', async () => {
        await setup();
        act(() => player.setQueueFromSongs(['s2', 's3', null]));
        expect(player.queue).toEqual(['s2', 's3']);

        act(() => player.playFromQueueAt(1));
        expect(player.track._id).toBe('s3');
        expect(player.queue).toEqual(['s2']);

        act(() => player.playFromQueueAt(5));
        expect(player.queue).toEqual(['s2']);

        act(() => player.clearQueue());
        expect(player.queue).toEqual([]);
    });
});

describe('when a song ends', () => {
    test('with no loop it stops, or moves on to the queue', async () => {
        await setup();
        await act(() => player.playWithId('s2'));
        await waitFor(() => expect(player.playStatus).toBe(true));

        act(() => player.addToQueue('s3'));
        finishTrack();
        expect(player.track._id).toBe('s3');
        expect(player.queue).toEqual([]);

        finishTrack();
        expect(player.track._id).toBe('s3');
    });

    test('loop-one plays the song a second time and then stops', async () => {
        await setup();
        await act(() => player.playWithId('s2'));
        act(() => player.toggleLoopMode());
        expect(player.loopMode).toBe(player.LOOP_MODE.LOOP_ONE);

        const playsBefore = HTMLMediaElement.prototype.play.mock.calls.length;
        finishTrack();
        expect(HTMLMediaElement.prototype.play.mock.calls.length).toBe(playsBefore + 1);

        finishTrack();
        expect(HTMLMediaElement.prototype.play.mock.calls.length).toBe(playsBefore + 1);
        expect(player.track._id).toBe('s2');
    });

    test('loop-all walks the library and wraps around', async () => {
        await setup();
        await act(() => player.playWithId('s3'));
        act(() => {
            player.toggleLoopMode();
        });
        act(() => player.toggleLoopMode());
        expect(player.loopMode).toBe(player.LOOP_MODE.LOOP_ALL);

        finishTrack();
        expect(player.track._id).toBe('s1');
        finishTrack();
        expect(player.track._id).toBe('s2');
    });

    test('loop-all still plays the queue first', async () => {
        await setup();
        act(() => {
            player.toggleLoopMode();
        });
        act(() => player.toggleLoopMode());
        act(() => player.addToQueue('s3'));

        finishTrack();
        expect(player.track._id).toBe('s3');
    });

    test('shuffle picks a different song', async () => {
        await setup();
        act(() => player.toggleShuffleMode());
        expect(player.shuffleMode).toBe(true);
        vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99);

        finishTrack();
        expect(player.track._id).toBe('s3'); // index 0 is the current song, so it draws again
    });

    test('toggling loop mode cycles off -> one -> all -> off', async () => {
        await setup();
        const modes = [];
        for (let i = 0; i < 3; i++) {
            act(() => player.toggleLoopMode());
            modes.push(player.loopMode);
        }
        expect(modes).toEqual([1, 2, 0]);
    });
});

describe('volume', () => {
    test('is clamped and unmutes when raised', async () => {
        await setup();
        expect(player.volume).toBe(0.5);

        act(() => player.changeVolume(2));
        expect(player.volume).toBe(1);
        act(() => player.changeVolume(-1));
        expect(player.volume).toBe(0);
        act(() => player.changeVolume('nonsense'));
        expect(player.volume).toBe(0);

        act(() => player.changeVolume(0.4));
        act(() => player.toggleMute());
        expect(player.isMuted).toBe(true);
        expect(audioEl().muted).toBe(true);

        act(() => player.changeVolume(0.7));
        expect(player.isMuted).toBe(false);
        expect(audioEl().volume).toBe(0.7);
    });

    test('unmuting from zero restores the previous level', async () => {
        await setup();
        act(() => player.toggleMute());
        act(() => player.changeVolume(0));
        act(() => player.toggleMute());

        expect(player.isMuted).toBe(false);
        expect(player.volume).toBe(0.5);
    });
});

describe('lyrics', () => {
    test('loads and parses lyrics for songs that have them, and only lets you open them then', async () => {
        await setup();

        act(() => player.toggleLyrics());
        expect(player.showLyrics).toBe(false);

        await act(() => player.playWithId('s2'));
        await waitFor(() => expect(player.currentLyrics).toHaveLength(2));
        expect(fetch).toHaveBeenCalledWith('https://cdn.test/s2.lrc');
        expect(player.currentLyrics.map((l) => l.text)).toEqual(['Hello', 'World']);

        act(() => player.toggleLyrics());
        expect(player.showLyrics).toBe(true);
    });

    test('songs without a lyrics file have none', async () => {
        await setup();
        expect(player.currentLyrics).toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('playTrack', () => {
    test('plays a song that only exists in a playlist response', async () => {
        await setup();
        const fromPlaylist = { ...songs[2], _id: 'only-in-playlist', file: 'https://cdn.test/other.mp3' };

        act(() => player.playTrack(fromPlaylist));

        expect(player.track._id).toBe('only-in-playlist');
        await waitFor(() => expect(player.playStatus).toBe(true));
        expect(player.playTrack(null)).toBe(false);
    });
});
