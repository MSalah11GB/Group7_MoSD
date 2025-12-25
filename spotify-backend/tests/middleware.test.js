import { jest } from '@jest/globals';

describe('middleware', () => {
  test('protectRoute returns 401 when unauthenticated', async () => {
    const { protectRoute } = await import('../src/middleware/authmiddleware.js');

    const req = { auth: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await protectRoute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthorized - you must be logged in',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('protectRoute calls next when authenticated', async () => {
    const { protectRoute } = await import('../src/middleware/authmiddleware.js');

    const req = { auth: { userId: 'user_123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await protectRoute(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('multer wrapper configures diskStorage filename', async () => {
    jest.resetModules();

    const diskStorageMock = jest.fn((opts) => opts);
    const multerMock = jest.fn((opts) => ({ __multer: true, opts }));
    multerMock.diskStorage = diskStorageMock;

    await jest.unstable_mockModule('multer', () => ({
      default: multerMock,
    }));

    const { default: upload } = await import('../src/middleware/multer.js');
    expect(upload).toBeDefined();

    expect(diskStorageMock).toHaveBeenCalledWith(
      expect.objectContaining({ filename: expect.any(Function) })
    );

    const { filename } = diskStorageMock.mock.results[0].value;
    const cb = jest.fn();
    filename({}, { originalname: 'cover.png' }, cb);
    expect(cb).toHaveBeenCalledWith(null, 'cover.png');

    expect(multerMock).toHaveBeenCalledWith({
      storage: diskStorageMock.mock.results[0].value,
    });
  });
});
