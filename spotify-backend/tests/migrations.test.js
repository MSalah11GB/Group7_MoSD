import { jest } from '@jest/globals';

describe('migrations', () => {
  test('add-bgColor-to-genre updates missing bgColor and disconnects', async () => {
    jest.resetModules();

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const connectMock = jest.fn(async () => undefined);
    const disconnectMock = jest.fn(async () => undefined);
    const updateManyMock = jest.fn(async () => ({ modifiedCount: 3 }));

    await jest.unstable_mockModule('mongoose', () => ({
      default: {
        connect: connectMock,
        disconnect: disconnectMock,
      },
    }));

    await jest.unstable_mockModule('../src/models/genreModel.js', () => ({
      default: {
        updateMany: updateManyMock,
      },
    }));

    process.env.MONGODB_URI = 'mongodb://localhost:27017';

    const { migrate } = await import('../src/migrations/add-bgColor-to-genre.js');
    await migrate({ exitProcess: false });

    expect(connectMock).toHaveBeenCalledWith('mongodb://localhost:27017/Musicify');
    expect(updateManyMock).toHaveBeenCalledWith(
      { bgColor: { $exists: false } },
      { $set: { bgColor: '#000000' } }
    );
    expect(disconnectMock).toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
