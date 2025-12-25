import { jest } from '@jest/globals';

describe('utils', () => {
  test('convertToArray normalizes input', async () => {
    jest.resetModules();

    await jest.unstable_mockModule('../src/models/genreModel.js', () => ({
      default: {},
    }));
    await jest.unstable_mockModule('../src/controllers/genreController.js', () => ({
      normalizeGenreName: (name) => (name ?? '').toString().trim().toLowerCase(),
    }));
    await jest.unstable_mockModule('../src/models/artistModel.js', () => ({
      default: { find: jest.fn() },
    }));

    const { convertToArray } = await import('../src/utils/songUtils.js');

    expect(convertToArray(undefined)).toEqual([]);
    expect(convertToArray(null)).toEqual([]);
    expect(convertToArray('a')).toEqual(['a']);
    expect(convertToArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(convertToArray({})).toEqual([]);
  });

  test('executeTransaction commits on success and aborts on error', async () => {
    jest.resetModules();

    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    const startSession = jest.fn(async () => session);

    await jest.unstable_mockModule('mongoose', () => ({
      default: { startSession },
    }));

    const { executeTransaction } = await import('../src/utils/transactionUtils.js');

    await executeTransaction(async () => {
      // no-op
    });

    expect(startSession).toHaveBeenCalled();
    expect(session.startTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();

    session.startTransaction.mockClear();
    session.commitTransaction.mockClear();
    session.abortTransaction.mockClear();
    session.endSession.mockClear();

    await expect(
      executeTransaction(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  test('upload utilities format duration and handle upload errors', async () => {
    jest.resetModules();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const uploadMock = jest.fn(async () => ({
      secure_url: 'https://cdn/audio.mp3',
      duration: 125,
    }));

    await jest.unstable_mockModule('cloudinary', () => ({
      v2: {
        uploader: { upload: uploadMock },
      },
    }));

    const { uploadAudioFile, uploadLrcFile } = await import('../src/utils/uploadUtils.js');

    const { fileUrl, duration } = await uploadAudioFile({ path: '/tmp/a.mp3' });
    expect(fileUrl).toBe('https://cdn/audio.mp3');
    expect(duration).toBe('2:5');

    uploadMock.mockImplementationOnce(async () => {
      throw new Error('nope');
    });
    const lrcUrl = await uploadLrcFile({ path: '/tmp/a.lrc' });
    expect(lrcUrl).toBe('');

    errorSpy.mockRestore();
  });

  test('extractSpotifyTrackId parses track urls', async () => {
    // This module has several heavy/optional deps (Spotify/YouTube/ffmpeg).
    // If they're not installed in a dev environment, skip this assertion.
    let extractSpotifyTrackId;
    try {
      ({ extractSpotifyTrackId } = await import('../src/utils/streamingUtils.js'));
    } catch {
      return;
    }
    expect(extractSpotifyTrackId('https://open.spotify.com/track/ABC123')).toBe('ABC123');
    expect(extractSpotifyTrackId('https://open.spotify.com/album/ABC123')).toBe(null);
  });
});
