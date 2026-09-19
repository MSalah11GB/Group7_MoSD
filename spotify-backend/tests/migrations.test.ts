import { afterAll, beforeAll, describe, expect, it, vi, inject } from 'vitest';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { countLegacySongs, normalizeCatalog } from '../src/migrations/002-normalize-catalog.js';

const uri = inject('mongoUri');

describe('add-bgColor-to-genre migration', () => {
  const dbName = `migration_${crypto.randomUUID().slice(0, 8)}`;
  const [base, query] = uri.split('?');

  beforeAll(() => {
    vi.stubEnv('MONGODB_URI', `${base!.replace(/\/$/, '')}/${dbName}${query ? `?${query}` : ''}`);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await mongoose.connect(uri, { dbName });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('adds a default bgColor to genres that lack one and leaves the rest alone', async () => {
    await mongoose.connect(uri, { dbName });
    await mongoose.connection.db!.collection('genres').insertMany([{ name: 'Old' }, { name: 'New', bgColor: '#ffffff' }]);
    await mongoose.disconnect();

    vi.resetModules();
    const { migrate } = await import('../src/migrations/add-bgColor-to-genre.js');
    await migrate({ exitProcess: false });

    await mongoose.connect(uri, { dbName });
    const docs = await mongoose.connection.db!.collection('genres').find().sort({ name: 1 }).toArray();
    expect(docs.map((d) => [d.name, d.bgColor])).toEqual([
      ['New', '#ffffff'],
      ['Old', '#000000'],
    ]);
    await mongoose.disconnect();
  });
});

describe('002-normalize-catalog migration', () => {
  const dbName = `normalize_${crypto.randomUUID().slice(0, 8)}`;
  let db: mongoose.mongo.Db;

  beforeAll(async () => {
    await mongoose.connect(uri, { dbName });
    db = mongoose.connection.db!;
  });

  afterAll(async () => {
    await db.dropDatabase();
    await mongoose.disconnect();
  });

  const seedLegacyData = async () => {
    const { insertedIds: albumIds } = await db
      .collection('albums')
      .insertMany([{ name: 'Rumours' }, { name: 'Twin' }, { name: 'Twin' }]);
    const rumours = albumIds[0];
    const { insertedIds } = await db.collection('songs').insertMany([
      { name: 'Linked', album: 'Rumours', youtubeId: 'abc', youtubeUrl: 'https://youtu.be/abc' },
      { name: 'NoAlbum', album: 'none' },
      { name: 'EmptyAlbum', album: '' },
      { name: 'Orphan', album: 'Deleted Album' },
      { name: 'Ambiguous', album: 'Twin' },
      { name: 'AlreadyMigrated', albumId: rumours },
    ]);
    await db.collection('genres').insertOne({ name: 'Rock', bgColor: '#000000', songList: [insertedIds[0]], songCount: 1 });
    await db.collection('artists').insertOne({ name: 'A', genres: [] });
    await db.collection('playlists').insertOne({ name: 'P', songs: [], songCount: 0 });
  };

  it('reports what it would change without touching anything by default', async () => {
    await seedLegacyData();

    const report = await normalizeCatalog(db);

    expect(report).toMatchObject({
      applied: false,
      songsLinkedToAlbum: 2,
      songsWithoutAlbum: 2,
      songsCleaned: 1,
      genresCleaned: 1,
      artistsCleaned: 1,
      playlistsCleaned: 1,
      ambiguousAlbumNames: ['Twin'],
    });
    expect(report.unmatchedSongs.map((s) => s.album)).toEqual(['Deleted Album']);
    expect(await countLegacySongs(db)).toBe(5);
    expect(await db.collection('songs').countDocuments({ albumId: { $exists: true } })).toBe(1);
  });

  it('applies the migration idempotently', async () => {
    const applied = await normalizeCatalog(db, { apply: true });
    expect(applied.applied).toBe(true);

    const byName = Object.fromEntries((await db.collection('songs').find().toArray()).map((s) => [s.name, s]));
    const rumours = await db.collection('albums').findOne({ name: 'Rumours' });

    expect(byName.Linked.albumId).toEqual(rumours!._id);
    expect(byName.Linked).not.toHaveProperty('album');
    expect(byName.Linked).not.toHaveProperty('youtubeId');
    expect(byName.NoAlbum.albumId).toBeNull();
    expect(byName.EmptyAlbum.albumId).toBeNull();
    expect(byName.Ambiguous.albumId).toEqual((await db.collection('albums').findOne({ name: 'Twin' }))!._id);
    expect(byName.AlreadyMigrated.albumId).toEqual(rumours!._id);
    // Unmatched songs keep their old value so nothing is lost and a re-run can link them later.
    expect(byName.Orphan).toMatchObject({ albumId: null, album: 'Deleted Album' });

    expect(await db.collection('genres').findOne({ name: 'Rock' })).not.toHaveProperty('songList');
    expect(await db.collection('artists').findOne({ name: 'A' })).not.toHaveProperty('genres');
    expect(await db.collection('playlists').findOne({ name: 'P' })).not.toHaveProperty('songCount');
    expect(await countLegacySongs(db)).toBe(1);

    const again = await normalizeCatalog(db, { apply: true });
    expect(again).toMatchObject({ songsLinkedToAlbum: 0, songsWithoutAlbum: 0, songsCleaned: 0, genresCleaned: 0 });
    expect(again.unmatchedSongs).toHaveLength(1);
  });

  it('links a previously unmatched song once its album exists', async () => {
    await db.collection('albums').insertOne({ name: 'Deleted Album' });

    const report = await normalizeCatalog(db, { apply: true });

    expect(report.songsLinkedToAlbum).toBe(1);
    expect(await countLegacySongs(db)).toBe(0);
    expect(await db.collection('songs').findOne({ name: 'Orphan' })).not.toHaveProperty('album');
  });
});
