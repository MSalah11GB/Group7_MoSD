import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import artistModel from '../src/models/artistModel.js';
import songModel from '../src/models/songModel.js';
import { parseCloudinaryUrl } from '../src/services/mediaService.js';
import { api } from './helpers/api.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import { uploaded, uploadedUrl } from './helpers/uploads.js';

const ADMIN = 'env_admin';

describe('POST /api/uploads/sign', () => {
  it('is admin only', async () => {
    expect((await api.post('/api/uploads/sign').send({ kind: 'audio' })).status).toBe(401);
    expect((await api.post('/api/uploads/sign', 'user_regular').send({ kind: 'audio' })).status).toBe(403);
  });

  it.each([
    ['image', 'image', 'musicify/images'],
    ['audio', 'video', 'musicify/audio'],
    ['lrc', 'raw', 'musicify/lyrics'],
  ])('signs a %s upload into its own folder', async (kind, resourceType, folder) => {
    const res = await api.post('/api/uploads/sign', ADMIN).send({ kind });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      apiKey: 'test-key',
      folder,
      signature: 'test-signature',
      uploadUrl: `https://api.cloudinary.com/v1_1/testcloud/${resourceType}/upload`,
    });
    expect(res.body.timestamp).toEqual(expect.any(Number));
    expect(JSON.stringify(res.body)).not.toContain('test-secret');

    const [params, secret] = lastSignCall();
    expect(params).toMatchObject({ folder });
    expect(secret).toBe('test-secret');
  });

  it('rejects unknown kinds', async () => {
    expect((await api.post('/api/uploads/sign', ADMIN).send({ kind: 'exe' })).status).toBe(422);
  });
});

const lastSignCall = () => {
  const calls = (cloudinary.utils.api_sign_request as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  return calls[calls.length - 1] as [Record<string, unknown>, string];
};

describe('parseCloudinaryUrl', () => {
  it.each([
    ['https://res.cloudinary.com/testcloud/image/upload/v123/musicify/images/a.png', 'image', 'musicify/images/a'],
    ['https://res.cloudinary.com/testcloud/video/upload/v9/musicify/audio/song.mp3', 'video', 'musicify/audio/song'],
    ['https://res.cloudinary.com/testcloud/raw/upload/v9/musicify/lyrics/l.lrc', 'raw', 'musicify/lyrics/l.lrc'],
    ['https://res.cloudinary.com/testcloud/image/upload/musicify/images/no-version.jpg', 'image', 'musicify/images/no-version'],
  ])('%s', (url, resourceType, publicId) => {
    expect(parseCloudinaryUrl(url)).toEqual({ resourceType, publicId });
  });

  it.each([
    'https://res.cloudinary.com/othercloud/image/upload/v1/a.png',
    'https://evil.example/testcloud/image/upload/v1/a.png',
    'https://i.scdn.co/image/abc',
    'not a url',
    '',
    undefined,
  ])('ignores %s (assets we do not own are never deleted)', (url) => {
    expect(parseCloudinaryUrl(url)).toBeNull();
  });
});

describe('asset cleanup', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  const destroy = cloudinary.uploader.destroy as unknown as { mock: { calls: unknown[][] } };

  it('deletes a song\'s audio and lyrics, but not its (possibly shared) image, when the song is removed', async () => {
    const song = await songModel.create({
      name: 'S',
      image: uploadedUrl('image', 'shared.png'),
      file: uploadedUrl('audio', 'gone.mp3'),
      lrcFile: uploadedUrl('lrc', 'gone.lrc'),
      duration: '1:00',
    });

    const res = await api.post('/api/song/remove', ADMIN).send({ id: song.id });
    expect(res.status).toBe(200);

    const destroyed = destroy.mock.calls.map(([id, options]) => [id, (options as { resource_type: string }).resource_type]);
    expect(destroyed).toEqual(
      expect.arrayContaining([
        ['musicify/audio/gone', 'video'],
        ['musicify/lyrics/gone.lrc', 'raw'],
      ])
    );
    expect(destroyed).toHaveLength(2);
  });

  it('deletes the old audio when it is replaced on update, and ignores foreign URLs', async () => {
    const artist = await artistModel.create({ name: 'A', bgColor: '#000000', image: 'i' });
    const song = await songModel.create({
      name: 'S',
      artist: [artist._id],
      image: 'i',
      file: uploadedUrl('audio', 'old.mp3'),
      lrcFile: 'https://example.com/legacy.lrc',
      duration: '1:00',
    });

    const res = await api
      .post('/api/song/update', ADMIN)
      .field('id', song.id)
      .field('name', 'S')
      .field('artists', artist.id)
      .field('audioPublicId', uploaded('audio', 'new.mp3'))
      .field('lrcPublicId', uploaded('lrc', 'new.lrc'));
    expect(res.status).toBe(200);

    expect(await songModel.findById(song._id)).toMatchObject({
      file: uploadedUrl('audio', 'new.mp3'),
      duration: '2:05',
    });
    expect(destroy.mock.calls.map(([id]) => id)).toEqual(['musicify/audio/old']);
  });
});
