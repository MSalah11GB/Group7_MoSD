import { jest } from '@jest/globals';

describe('config', () => {
  test('connectDB connects to Musicify database', async () => {
    jest.resetModules();

    const connectMock = jest.fn();
    const onMock = jest.fn();

    await jest.unstable_mockModule('mongoose', () => ({
      default: {
        connect: connectMock,
        connection: { on: onMock },
      },
    }));

    process.env.MONGODB_URI = 'mongodb://localhost:27017';

    const { default: connectDB } = await import('../src/config/mongodb.js');
    await connectDB();

    expect(onMock).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(connectMock).toHaveBeenCalledWith('mongodb://localhost:27017/Musicify');
  });

  test('connectCloudinary uses env credentials', async () => {
    jest.resetModules();

    const configMock = jest.fn();

    await jest.unstable_mockModule('cloudinary', () => ({
      v2: {
        config: configMock,
      },
    }));

    process.env.CLOUDINARY_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_SECRET_KEY = 'secret';

    const { default: connectCloudinary } = await import('../src/config/cloudinary.js');
    await connectCloudinary();

    expect(configMock).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'key',
      api_secret: 'secret',
    });
  });
});
