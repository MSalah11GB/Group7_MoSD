import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import albumModel from '../src/models/albumModel.js';
import songModel from '../src/models/songModel.js';
import playlistModel from '../src/models/playlistModel.js';
import { api } from './helpers/api.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const OWNER = 'user_owner';
const OTHER = 'user_other';

const makeSong = (name = 'Song', fields: Record<string, unknown> = {}) =>
  songModel.create({ name, image: 'i', file: 'f', duration: '1:00', ...fields });

const createPlaylist = async (user: string, fields: Record<string, unknown> = {}) => {
  const res = await api.post('/api/playlist/create', user).send({ name: 'Mix', ...fields });
  expect(res.status).toBe(201);
  return res.body.playlist as { _id: string };
};

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearTestDb);

describe('creating playlists', () => {
  it('takes the creator from the session, ignoring any clerkId in the body', async () => {
    const created = await createPlaylist(OWNER, { clerkId: OTHER });

    const res = await api.get(`/api/playlist/get?id=${created._id}`, OWNER);
    expect(res.body.playlist.creator.clerkId).toBe(OWNER);
  });

  it('validates the payload', async () => {
    const res = await api.post('/api/playlist/create', OWNER).send({ name: '   ' });
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Playlist name is required');
  });

  it('accepts multipart booleans sent as strings', async () => {
    const res = await api.post('/api/playlist/create', OWNER).field('name', 'Secret').field('isPublic', 'false');
    expect(res.status).toBe(201);
    expect(res.body.playlist.isPublic).toBe(false);
  });
});

describe('ownership', () => {
  it('lets only the creator update, delete and edit songs', async () => {
    const { _id } = await createPlaylist(OWNER);
    const song = await makeSong();

    const attempts = [
      api.post('/api/playlist/update', OTHER).send({ id: _id, name: 'Hacked' }),
      api.post('/api/playlist/delete', OTHER).send({ id: _id }),
      api.post('/api/playlist/add-song', OTHER).send({ playlistId: _id, songId: song.id }),
      api.post('/api/playlist/remove-song', OTHER).send({ playlistId: _id, songId: song.id }),
      api.post('/api/playlist/reorder-songs', OTHER).send({ playlistId: _id, songIds: [] }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(403);
    }

    const stored = await playlistModel.findById(_id);
    expect(stored?.name).toBe('Mix');
    expect(stored?.songs).toHaveLength(0);
  });

  it('cannot be bypassed by claiming the owner in the request body', async () => {
    const { _id } = await createPlaylist(OWNER);

    const res = await api.post('/api/playlist/delete', OTHER).send({ id: _id, clerkId: OWNER });
    expect(res.status).toBe(403);
    expect(await playlistModel.exists({ _id })).toBeTruthy();
  });

  it('allows the owner to update and delete', async () => {
    const { _id } = await createPlaylist(OWNER);

    const updated = await api.post('/api/playlist/update', OWNER).send({ id: _id, name: 'Renamed', isPublic: false });
    expect(updated.status).toBe(200);
    expect(updated.body.playlist).toMatchObject({ name: 'Renamed', isPublic: false });

    const deleted = await api.post('/api/playlist/delete', OWNER).send({ id: _id });
    expect(deleted.status).toBe(200);
    expect(await playlistModel.exists({ _id })).toBeNull();
  });

  it('returns 404 for a playlist that does not exist', async () => {
    const res = await api.post('/api/playlist/delete', OWNER).send({ id: '64b7f0f4f4f4f4f4f4f4f4f4' });
    expect(res.status).toBe(404);
  });
});

describe('visibility', () => {
  it('hides private playlists from everyone but the owner', async () => {
    const pub = await createPlaylist(OWNER, { name: 'Public one' });
    const priv = await createPlaylist(OWNER, { name: 'Private one', isPublic: false });

    const names = (res: { body: { playlists: { name: string }[] } }) => res.body.playlists.map((p) => p.name).sort();

    expect(names(await api.get('/api/playlist/list'))).toEqual(['Public one']);
    expect(names(await api.get('/api/playlist/list', OTHER))).toEqual(['Public one']);
    expect(names(await api.get('/api/playlist/list', OWNER))).toEqual(['Private one', 'Public one']);

    expect((await api.get(`/api/playlist/get?id=${priv._id}`)).status).toBe(403);
    expect((await api.get(`/api/playlist/get?id=${priv._id}`, OTHER)).status).toBe(403);
    expect((await api.get(`/api/playlist/get?id=${priv._id}`, OWNER)).status).toBe(200);
    expect((await api.get(`/api/playlist/get?id=${pub._id}`)).status).toBe(200);
  });

  it('supports "mine" only for signed-in users', async () => {
    await createPlaylist(OWNER, { name: 'Mine' });
    await createPlaylist(OTHER, { name: 'Theirs' });

    expect((await api.get('/api/playlist/list?mine=true')).status).toBe(401);

    const res = await api.get('/api/playlist/list?mine=true', OWNER);
    expect(res.body.playlists.map((p: { name: string }) => p.name)).toEqual(['Mine']);
  });

  it('treats search input literally and ignores operator injection', async () => {
    await createPlaylist(OWNER, { name: 'Rock (live)' });

    const literal = await api.get('/api/playlist/list').query({ search: '(live)' });
    expect(literal.status).toBe(200);
    expect(literal.body.playlists).toHaveLength(1);

    const redos = await api.get('/api/playlist/list').query({ search: '(a+)+$' });
    expect(redos.status).toBe(200);
    expect(redos.body.playlists).toHaveLength(0);

    // Express parses `search[$ne]` as a flat key, so no operator object can reach the query.
    const injected = await api.get('/api/playlist/list?search[$ne]=x');
    expect(injected.status).toBe(200);
    expect(injected.body.playlists).toHaveLength(1);
  });
});

describe('songs in playlists', () => {
  it('adds, rejects duplicates and unknown songs, reorders and removes', async () => {
    const { _id } = await createPlaylist(OWNER);
    const [a, b] = await Promise.all([makeSong('A'), makeSong('B')]);

    expect((await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: a.id })).status).toBe(200);
    expect((await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: b.id })).status).toBe(200);
    expect((await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: a.id })).status).toBe(409);
    expect(
      (await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: '64b7f0f4f4f4f4f4f4f4f4f4' })).status
    ).toBe(404);

    const bad = await api.post('/api/playlist/reorder-songs', OWNER).send({ playlistId: _id, songIds: [a.id] });
    expect(bad.status).toBe(422);

    const reorder = await api.post('/api/playlist/reorder-songs', OWNER).send({ playlistId: _id, songIds: [b.id, a.id] });
    expect(reorder.status).toBe(200);
    const after = await api.get(`/api/playlist/get?id=${_id}`, OWNER);
    expect(after.body.playlist.songs.map((s: { name: string }) => s.name)).toEqual(['B', 'A']);
    expect(after.body.playlist.songCount).toBe(2);

    expect((await api.post('/api/playlist/remove-song', OWNER).send({ playlistId: _id, songId: a.id })).status).toBe(200);
    expect((await api.post('/api/playlist/remove-song', OWNER).send({ playlistId: _id, songId: a.id })).status).toBe(404);
  });

  it('returns songs with their album name and a computed songCount', async () => {
    const { _id } = await createPlaylist(OWNER);
    const album = await albumModel.create({ name: 'Greatest', desc: 'd', bgColor: '#000000', image: 'i' });
    const [withAlbum, without] = await Promise.all([makeSong('WithAlbum', { albumId: album._id }), makeSong('Without')]);
    for (const song of [withAlbum, without]) {
      await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: song.id });
    }

    const res = await api.get(`/api/playlist/get?id=${_id}`, OWNER);
    const albums = Object.fromEntries(res.body.playlist.songs.map((s: { name: string; album: string }) => [s.name, s.album]));
    expect(albums).toEqual({ WithAlbum: 'Greatest', Without: 'none' });
    expect(res.body.playlist.songCount).toBe(2);

    const list = await api.get('/api/playlist/list', OWNER);
    expect(list.body.playlists[0].songCount).toBe(2);
  });

  it('hides songs that no longer exist without writing to the database on GET', async () => {
    const { _id } = await createPlaylist(OWNER);
    const song = await makeSong();
    await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: song.id });
    await songModel.deleteOne({ _id: song._id });

    const res = await api.get(`/api/playlist/get?id=${_id}`, OWNER);
    expect(res.body.playlist.songs).toEqual([]);
    expect(res.body.playlist.songCount).toBe(0);
    expect((await playlistModel.findById(_id))?.songs).toHaveLength(1);
  });

  it('drops a song from every playlist when an admin deletes it', async () => {
    const { _id } = await createPlaylist(OWNER);
    const [keep, gone] = await Promise.all([makeSong('Keep'), makeSong('Gone')]);
    for (const song of [keep, gone]) {
      await api.post('/api/playlist/add-song', OWNER).send({ playlistId: _id, songId: song.id });
    }

    const res = await api.post('/api/song/remove', 'env_admin').send({ id: gone.id });
    expect(res.status).toBe(200);

    const stored = await playlistModel.findById(_id);
    expect(stored?.songs.map(String)).toEqual([keep.id]);
  });
});

describe('auth sync', () => {
  it('creates the user from the Clerk profile, not from the request body', async () => {
    const res = await api.post('/api/auth/sync', 'user_new').send({ id: 'someone_else', firstName: 'Mallory' });
    expect(res.status).toBe(200);

    const { User } = await import('../src/models/userModel.js');
    const users = await User.find();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ clerkId: 'user_new', fullName: 'Test user_new' });
  });
});
