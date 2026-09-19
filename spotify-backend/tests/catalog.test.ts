import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import albumModel from '../src/models/albumModel.js';
import artistModel from '../src/models/artistModel.js';
import genreModel from '../src/models/genreModel.js';
import playlistModel from '../src/models/playlistModel.js';
import songModel from '../src/models/songModel.js';
import { api } from './helpers/api.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import { uploaded, uploadedUrl } from './helpers/uploads.js';

const ADMIN = 'env_admin';
const OID = '64b7f0f4f4f4f4f4f4f4f4f4';

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearTestDb);

const makeArtist = (name = 'A') => artistModel.create({ name, bgColor: '#000000', image: 'i' });
const makeAlbum = (name = 'Alb') => albumModel.create({ name, desc: 'd', bgColor: '#000000', image: 'album-img' });
const makeSong = (fields: Record<string, unknown> = {}) =>
  songModel.create({ name: 'S', image: 'i', file: 'f', duration: '1:00', ...fields });

describe('genres', () => {
  it('creates, lists publicly, and rejects normalized duplicates', async () => {
    const created = await api.post('/api/genre/add', ADMIN).send({ name: 'Hip-Hop', bgColor: '#112233' });
    expect(created.status).toBe(201);

    const duplicate = await api.post('/api/genre/add', ADMIN).send({ name: 'hip hop', bgColor: '#112233' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ success: false, isDuplicate: true });

    const list = await api.get('/api/genre/list');
    expect(list.body.genres.map((g: { name: string }) => g.name)).toEqual(['Hip-Hop']);
  });

  it('validates the color', async () => {
    const res = await api.post('/api/genre/add', ADMIN).send({ name: 'Pop', bgColor: 'red; drop' });
    expect(res.status).toBe(422);
  });

  it('supports multipart form submissions like the admin panel sends', async () => {
    const res = await api.post('/api/genre/add', ADMIN).field('name', 'Jazz').field('bgColor', '#abcdef');
    expect(res.status).toBe(201);
  });

  it('computes songCount and songList from the songs instead of storing them', async () => {
    const rock = await genreModel.create({ name: 'Rock' });
    const pop = await genreModel.create({ name: 'Pop' });
    const album = await makeAlbum('Greatest');
    await makeSong({ name: 'One', genres: [rock._id, pop._id], albumId: album._id });
    await makeSong({ name: 'Two', genres: [rock._id] });

    const plain = await api.get('/api/genre/list');
    const counts = Object.fromEntries(plain.body.genres.map((g: { name: string; songCount: number }) => [g.name, g.songCount]));
    expect(counts).toEqual({ Pop: 1, Rock: 2 });
    expect(plain.body.genres[0].songList).toBeUndefined();

    const withSongs = await api.get('/api/genre/list').query({ includeSongs: 'true', id: rock.id });
    const [genre] = withSongs.body.genres;
    expect(genre.songCount).toBe(2);
    expect(genre.songList.map((s: { name: string }) => s.name).sort()).toEqual(['One', 'Two']);
    expect(genre.songList.find((s: { name: string }) => s.name === 'One').album).toBe('Greatest');
  });

  it('removes a deleted genre from songs', async () => {
    const genre = await genreModel.create({ name: 'Rock' });
    const song = await makeSong({ genres: [genre._id] });

    const res = await api.post('/api/genre/remove', ADMIN).send({ id: genre.id });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Genre removed and removed from 1 songs');
    expect((await songModel.findById(song._id))?.genres).toHaveLength(0);
  });

  it('returns 404 when updating an unknown genre', async () => {
    const res = await api.post('/api/genre/update', ADMIN).send({ id: OID, name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('artists', () => {
  const create = (name: string, image?: string) =>
    api
      .post('/api/artist/add', ADMIN)
      .field('name', name)
      .field('bgColor', '#123456')
      .field('imagePublicId', image ?? uploaded('image', 'adele.png'));

  it('needs an uploaded image and rejects case-insensitive duplicates', async () => {
    const noImage = await api.post('/api/artist/add', ADMIN).field('name', 'Adele').field('bgColor', '#123456');
    expect(noImage.status).toBe(422);

    const ok = await create('Adele');
    expect(ok.status).toBe(201);
    expect(await artistModel.findOne({ name: 'Adele' })).toMatchObject({ image: uploadedUrl('image', 'adele.png') });

    const dup = await create(' ADELE ');
    expect(dup.status).toBe(409);
    expect(dup.body.isDuplicate).toBe(true);
  });

  it('rejects uploads that are not in the image folder or do not exist', async () => {
    expect((await create('Wrong', uploaded('audio', 'song.mp3'))).status).toBe(422);
    expect((await create('Gone', uploaded('image', 'missing.png'))).status).toBe(422);
    expect(await artistModel.countDocuments()).toBe(0);
  });

  it('refuses file attachments so uploads must go directly to Cloudinary', async () => {
    const res = await create('Adele').attach('image', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(await artistModel.countDocuments()).toBe(0);
  });

  it('computes an artist\'s genres from their songs', async () => {
    const [rock, pop] = await Promise.all([genreModel.create({ name: 'Rock' }), genreModel.create({ name: 'Pop' })]);
    const artist = await makeArtist('Band');
    const loner = await makeArtist('Loner');
    await makeSong({ artist: [artist._id], genres: [rock._id] });
    await makeSong({ artist: [artist._id], genres: [rock._id, pop._id] });

    const res = await api.get('/api/artist/list');
    const byName = Object.fromEntries(res.body.artists.map((a: { name: string; genres: string[] }) => [a.name, a.genres.sort()]));
    expect(byName.Band).toEqual([rock.id, pop.id].sort());
    expect(byName.Loner).toEqual([]);
    expect(loner.id).toBeTruthy();
  });

  it('refuses to delete an artist that still has songs', async () => {
    const artist = await makeArtist();
    await makeSong({ artist: [artist._id] });

    const res = await api.post('/api/artist/remove', ADMIN).send({ id: artist.id });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ hasSongs: true, songCount: 1 });
    expect(await artistModel.exists({ _id: artist._id })).toBeTruthy();
  });

  it('escapes regex characters in search', async () => {
    await artistModel.create({ name: 'AC/DC', bgColor: '#000000', image: 'i' });
    const res = await api.get('/api/artist/list').query({ search: 'C/D' });
    expect(res.body.artists).toHaveLength(1);
    expect((await api.get('/api/artist/list').query({ search: '.*' })).body.artists).toHaveLength(0);
  });
});

describe('albums', () => {
  it('asks for confirmation before deleting an album, its songs and their playlist entries', async () => {
    const album = await makeAlbum('Rumours');
    const song = await makeSong({ albumId: album._id });
    const playlist = await playlistModel.create({ name: 'P', image: 'i', creator: album._id, songs: [song._id] });

    const first = await api.post('/api/album/remove', ADMIN).send({ id: album.id });
    expect(first.body).toMatchObject({ success: true, requiresConfirmation: true, songCount: 1 });
    expect(await songModel.countDocuments()).toBe(1);

    const second = await api.post('/api/album/remove', ADMIN).send({ id: album.id, confirmed: true });
    expect(second.status).toBe(200);
    expect(second.body.deletedSongs).toBe(1);
    expect(await songModel.countDocuments()).toBe(0);
    expect(await albumModel.countDocuments()).toBe(0);

    const stored = await playlistModel.findById(playlist._id);
    expect(stored?.songs).toHaveLength(0);
  });

  it('needs an uploaded image when creating', async () => {
    const res = await api.post('/api/album/add', ADMIN).field('name', 'N').field('desc', 'D').field('bgColor', '#000000');
    expect(res.status).toBe(422);

    const ok = await api
      .post('/api/album/add', ADMIN)
      .field('name', 'N')
      .field('desc', 'D')
      .field('bgColor', '#000000')
      .field('imagePublicId', uploaded('image', 'cover.png'));
    expect(ok.status).toBe(201);
  });

  it('only changes provided fields on update', async () => {
    const album = await albumModel.create({ name: 'Old', desc: 'keep', bgColor: '#000000', image: 'i' });
    const res = await api.post('/api/album/update', ADMIN).send({ id: album.id, name: 'New' });
    expect(res.status).toBe(200);
    expect(await albumModel.findById(album._id)).toMatchObject({ name: 'New', desc: 'keep' });
  });

  it('shows a renamed album on its songs, because songs reference the album', async () => {
    const album = await makeAlbum('Before');
    await makeSong({ albumId: album._id });

    await api.post('/api/album/update', ADMIN).send({ id: album.id, name: 'After' });

    const list = await api.get('/api/song/list');
    expect(list.body.songs[0]).toMatchObject({ album: 'After', albumId: album.id });
  });
});

describe('songs', () => {
  const songForm = (artistId: string, extra: Record<string, string> = {}) => {
    let req = api
      .post('/api/song/add', ADMIN)
      .field('name', 'Track')
      .field('artists', artistId)
      .field('audioPublicId', uploaded('audio', 'track.mp3'));
    for (const [key, value] of Object.entries(extra)) req = req.field(key, value);
    return req;
  };

  it('is created from direct uploads, with the duration read from Cloudinary and the album by reference', async () => {
    const artist = await makeArtist();
    const genre = await genreModel.create({ name: 'Pop' });
    const album = await makeAlbum('Alb');

    const res = await songForm(artist.id, {
      genres: genre.id,
      albumId: album.id,
      useAlbumImage: 'true',
      lrcPublicId: uploaded('lrc', 'track.lrc'),
    });
    expect(res.status).toBe(201);

    const stored = await songModel.findOne({ name: 'Track' });
    expect(stored).toMatchObject({
      artistName: 'A',
      duration: '2:05',
      image: 'album-img',
      file: uploadedUrl('audio', 'track.mp3'),
      lrcFile: uploadedUrl('lrc', 'track.lrc'),
    });
    expect(stored?.albumId?.toString()).toBe(album.id);

    const list = await api.get('/api/song/list').query({ search: 'alb' });
    expect(list.body.songs).toHaveLength(1);
    expect(list.body.songs[0]).toMatchObject({ album: 'Alb', artistName: 'A' });
  });

  it('reports "none" for songs without an album and accepts "none" from the admin form', async () => {
    const artist = await makeArtist();
    const res = await songForm(artist.id, { albumId: 'none', imagePublicId: uploaded('image', 'cover.png') });
    expect(res.status).toBe(201);

    const list = await api.get('/api/song/list');
    expect(list.body.songs[0]).toMatchObject({ album: 'none', albumId: null });
  });

  it('requires audio, an image source, an artist, and an existing album', async () => {
    const artist = await makeArtist();

    const noAudio = await api.post('/api/song/add', ADMIN).field('name', 'T').field('artists', artist.id).field('imagePublicId', uploaded('image', 'c.png'));
    expect(noAudio.body.message).toBe('Audio file is required');

    const noImage = await songForm(artist.id);
    expect(noImage.body.message).toBe('Image is required');

    const noArtist = await api.post('/api/song/add', ADMIN).field('name', 'T').field('audioPublicId', uploaded('audio', 't.mp3'));
    expect(noArtist.body.message).toBe('At least one artist is required');

    const badAlbum = await songForm(artist.id, { albumId: OID, imagePublicId: uploaded('image', 'c.png') });
    expect(badAlbum.body.message).toBe('Album not found');

    const badAudio = await songForm(artist.id, { imagePublicId: uploaded('image', 'c.png'), audioPublicId: uploaded('audio', 'missing.mp3') });
    expect(badAudio.status).toBe(422);
    expect(await songModel.countDocuments()).toBe(0);
  });

  it('only accepts Spotify-hosted cover URLs', async () => {
    const artist = await makeArtist();
    const bad = await songForm(artist.id, { imageUrl: 'https://evil.example/cover.jpg' });
    expect(bad.status).toBe(422);

    const ok = await songForm(artist.id, { imageUrl: 'https://i.scdn.co/image/abc' });
    expect(ok.status).toBe(201);
  });

  it('rejects a song that references unknown artists', async () => {
    const res = await songForm(OID, { imagePublicId: uploaded('image', 'c.png') });
    expect(res.status).toBe(422);
    expect(await songModel.countDocuments()).toBe(0);
  });

  it('updates fields, moves between albums, and keeps assets it was not given', async () => {
    const artist = await makeArtist();
    const [a, b] = await Promise.all([makeAlbum('A1'), makeAlbum('B1')]);
    const song = await makeSong({ artist: [artist._id], albumId: a._id, file: 'keep-me' });

    const res = await api
      .post('/api/song/update', ADMIN)
      .field('id', song.id)
      .field('name', 'Renamed')
      .field('artists', artist.id)
      .field('albumId', b.id);
    expect(res.status).toBe(200);

    const stored = await songModel.findById(song._id);
    expect(stored).toMatchObject({ name: 'Renamed', file: 'keep-me' });
    expect(stored?.albumId?.toString()).toBe(b.id);

    const none = await api.post('/api/song/update', ADMIN).field('id', song.id).field('name', 'Renamed').field('artists', artist.id).field('albumId', 'none');
    expect(none.status).toBe(200);
    expect((await songModel.findById(song._id))?.albumId).toBeNull();
  });

  it('creates missing genres by name and reuses existing ones regardless of punctuation', async () => {
    const artist = await makeArtist();
    await genreModel.create({ name: 'Hip-Hop' });

    const res = await songForm(artist.id, { imagePublicId: uploaded('image', 'c.png') })
      .field('newGenres', 'hip hop')
      .field('newGenres', 'Jazz');
    expect(res.status).toBe(201);
    expect(await genreModel.countDocuments()).toBe(2);
  });

  it('is no longer served by the old YouTube endpoint', async () => {
    expect((await api.post('/api/song/download', ADMIN).send({})).status).toBe(404);
  });

  it('returns 503 or 422 from Spotify lookup without calling Spotify for invalid input', async () => {
    const invalid = await api.post('/api/song/spotify-metadata', ADMIN).send({ spotifyUrl: 'https://open.spotify.com/album/x' });
    expect(invalid.status).toBe(422);

    const unconfigured = await api.post('/api/song/spotify-metadata', ADMIN).send({ spotifyUrl: 'https://open.spotify.com/track/abc123' });
    expect(unconfigured.status).toBe(503);
  });
});

describe('pagination', () => {
  it('is opt-in: lists return everything unless page or limit is given', async () => {
    for (let i = 1; i <= 5; i++) await makeAlbum(`Album ${i}`);

    const all = await api.get('/api/album/list');
    expect(all.body.albums).toHaveLength(5);
    expect(all.body.pagination).toBeUndefined();

    const page2 = await api.get('/api/album/list').query({ page: 2, limit: 2 });
    expect(page2.body.albums.map((a: { name: string }) => a.name)).toEqual(['Album 3', 'Album 4']);
    expect(page2.body.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });

    const defaults = await api.get('/api/album/list').query({ page: 1 });
    expect(defaults.body.pagination).toMatchObject({ page: 1, limit: 20, total: 5, totalPages: 1 });
  });

  it('applies to songs, artists and playlists and combines with search', async () => {
    for (let i = 1; i <= 3; i++) await makeSong({ name: `Song ${i}` });
    for (let i = 1; i <= 3; i++) await makeArtist(`Artist ${i}`);

    const songs = await api.get('/api/song/list').query({ limit: 2 });
    expect(songs.body.songs).toHaveLength(2);
    expect(songs.body.pagination.total).toBe(3);

    const artists = await api.get('/api/artist/list').query({ search: 'artist', limit: 1, page: 3 });
    expect(artists.body.artists).toHaveLength(1);
    expect(artists.body.pagination).toMatchObject({ total: 3, totalPages: 3 });

    expect((await api.get('/api/playlist/list').query({ limit: 5 })).body.pagination.total).toBe(0);
  });

  it('rejects out-of-range values', async () => {
    expect((await api.get('/api/album/list').query({ limit: 1000 })).status).toBe(422);
    expect((await api.get('/api/album/list').query({ page: 0 })).status).toBe(422);
    expect((await api.get('/api/album/list').query({ limit: 'abc' })).status).toBe(422);
  });
});
