import { jest } from '@jest/globals';

describe('controllers', () => {
  test('genre normalizeGenreName strips punctuation and lowercases', async () => {
    const { normalizeGenreName } = await import('../src/controllers/genreController.js');
    expect(normalizeGenreName('  Hip-Hop!!  ')).toBe('hiphop');
    expect(normalizeGenreName('R&B / Soul')).toBe('rbsoul');
    expect(normalizeGenreName('')).toBe('');
  });

  test('album removeAlbum returns not found when album missing', async () => {
    jest.resetModules();

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const findById = jest.fn(async () => null);
    const findByIdAndDelete = jest.fn();

    await jest.unstable_mockModule('../src/models/albumModel.js', () => ({
      default: {
        findById,
        findByIdAndDelete,
      },
    }));

    await jest.unstable_mockModule('../src/models/songModel.js', () => ({
      default: {
        find: jest.fn(),
        deleteMany: jest.fn(),
      },
    }));

    await jest.unstable_mockModule('cloudinary', () => ({
      v2: {
        uploader: { upload: jest.fn() },
      },
    }));

    const { removeAlbum } = await import('../src/controllers/albumController.js');

    const req = { body: { id: 'album123', confirmed: true } };
    const res = { json: jest.fn() };

    await removeAlbum(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Album not found' })
    );

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
