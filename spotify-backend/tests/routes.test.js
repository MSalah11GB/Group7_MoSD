import { jest } from '@jest/globals';

const getRouteTable = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
    }));

describe('routes', () => {
  test('album routes are registered', async () => {
    const { default: albumRouter } = await import('../src/routes/albumRoute.js');
    const routes = getRouteTable(albumRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/add', methods: expect.objectContaining({ post: true }) },
        { path: '/list', methods: expect.objectContaining({ get: true }) },
        { path: '/remove', methods: expect.objectContaining({ post: true }) },
        { path: '/update', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('artist routes are registered', async () => {
    const { default: artistRouter } = await import('../src/routes/artistRoute.js');
    const routes = getRouteTable(artistRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/add', methods: expect.objectContaining({ post: true }) },
        { path: '/list', methods: expect.objectContaining({ get: true }) },
        { path: '/remove', methods: expect.objectContaining({ post: true }) },
        { path: '/update', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('genre routes are registered', async () => {
    const { default: genreRouter } = await import('../src/routes/genreRoute.js');
    const routes = getRouteTable(genreRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/add', methods: expect.objectContaining({ post: true }) },
        { path: '/list', methods: expect.objectContaining({ get: true }) },
        { path: '/remove', methods: expect.objectContaining({ post: true }) },
        { path: '/update', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('auth routes are registered', async () => {
    const { default: authRouter } = await import('../src/routes/authRoute.js');
    const routes = getRouteTable(authRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/callback', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('playlist routes are registered', async () => {
    const { default: playlistRouter } = await import('../src/routes/playlistRoute.js');
    const routes = getRouteTable(playlistRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/create', methods: expect.objectContaining({ post: true }) },
        { path: '/list', methods: expect.objectContaining({ get: true }) },
        { path: '/get', methods: expect.objectContaining({ get: true }) },
        { path: '/update', methods: expect.objectContaining({ post: true }) },
        { path: '/delete', methods: expect.objectContaining({ post: true }) },
        { path: '/add-song', methods: expect.objectContaining({ post: true }) },
        { path: '/remove-song', methods: expect.objectContaining({ post: true }) },
        { path: '/reorder-songs', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('song routes are registered', async () => {
    jest.resetModules();

    const mkdirMock = jest.fn(async () => undefined);
    await jest.unstable_mockModule('fs/promises', () => ({
      default: { mkdir: mkdirMock },
    }));

    await jest.unstable_mockModule('../src/controllers/songController.js', () => ({
      addSong: jest.fn(),
      listSong: jest.fn(),
      removeSong: jest.fn(),
      updateSong: jest.fn(),
      uploadSong: jest.fn(),
      downloadSong: jest.fn(),
    }));

    const { default: songRouter } = await import('../src/routes/songRoute.js');
    const routes = getRouteTable(songRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/add', methods: expect.objectContaining({ post: true }) },
        { path: '/list', methods: expect.objectContaining({ get: true }) },
        { path: '/remove', methods: expect.objectContaining({ post: true }) },
        { path: '/update', methods: expect.objectContaining({ post: true }) },
        { path: '/upload', methods: expect.objectContaining({ post: true }) },
        { path: '/download', methods: expect.objectContaining({ post: true }) },
      ])
    );
  });

  test('user routes are registered', async () => {
    const { default: userRouter } = await import('../src/routes/userRoute.js');
    const routes = getRouteTable(userRouter);

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/', methods: expect.objectContaining({ get: true }) },
      ])
    );
  });
});
