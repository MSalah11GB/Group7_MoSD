import mongoose from 'mongoose';
import type { AnyBulkWriteOperation, Db, Document, ObjectId } from 'mongodb';
import { pathToFileURL } from 'node:url';
import { env } from '../env.js';
import { buildMongoUri } from '../config/mongodb.js';

/**
 * Moves an existing database to the normalized catalog schema:
 *  - songs reference their album by id (`albumId`) instead of storing its name in `album`
 *  - counters and lists that duplicated other data are removed and computed on read instead
 *    (genre songCount/songList, artist genres, playlist songCount)
 *  - the unused `youtubeId`/`youtubeUrl` song fields are removed
 *
 * Safe to run repeatedly. Without `apply` it only reports what it would change.
 */

const LEGACY_SONG_FILTER = { $or: [{ albumId: { $exists: false } }, { album: { $exists: true } }] };

export const countLegacySongs = (db: Db) => db.collection('songs').countDocuments(LEGACY_SONG_FILTER);

export type MigrationReport = {
  applied: boolean;
  songsLinkedToAlbum: number;
  songsWithoutAlbum: number;
  /** Songs whose old album name matches no album; they are left as "no album" and keep their old value. */
  unmatchedSongs: { id: string; album: string }[];
  /** Album names shared by several albums; the first album with that name is used. */
  ambiguousAlbumNames: string[];
  songsCleaned: number;
  genresCleaned: number;
  artistsCleaned: number;
  playlistsCleaned: number;
};

export async function normalizeCatalog(db: Db, { apply = false } = {}): Promise<MigrationReport> {
  const report: MigrationReport = {
    applied: apply,
    songsLinkedToAlbum: 0,
    songsWithoutAlbum: 0,
    unmatchedSongs: [],
    ambiguousAlbumNames: [],
    songsCleaned: 0,
    genresCleaned: 0,
    artistsCleaned: 0,
    playlistsCleaned: 0,
  };

  const albumIds = new Map<string, ObjectId>();
  const ambiguous = new Set<string>();
  for (const album of await db.collection('albums').find({}, { projection: { name: 1 } }).toArray()) {
    if (albumIds.has(album.name)) ambiguous.add(album.name);
    else albumIds.set(album.name, album._id as ObjectId);
  }
  report.ambiguousAlbumNames = [...ambiguous];

  const songs = db.collection('songs');
  const operations: AnyBulkWriteOperation[] = [];

  for await (const song of songs.find(LEGACY_SONG_FILTER, { projection: { album: 1 } })) {
    const legacyName = typeof song.album === 'string' ? song.album : '';

    if (legacyName === '' || legacyName === 'none') {
      report.songsWithoutAlbum++;
      operations.push({
        updateOne: { filter: { _id: song._id }, update: { $set: { albumId: null }, $unset: { album: '' } } },
      });
      continue;
    }

    const albumId = albumIds.get(legacyName);
    if (albumId) {
      report.songsLinkedToAlbum++;
      operations.push({
        updateOne: { filter: { _id: song._id }, update: { $set: { albumId }, $unset: { album: '' } } },
      });
    } else {
      report.unmatchedSongs.push({ id: String(song._id), album: legacyName });
      operations.push({ updateOne: { filter: { _id: song._id }, update: { $set: { albumId: null } } } });
    }
  }

  if (apply && operations.length > 0) await songs.bulkWrite(operations);

  const cleanups: {
    collection: string;
    filter: Document;
    unset: Record<string, ''>;
    key: 'songsCleaned' | 'genresCleaned' | 'artistsCleaned' | 'playlistsCleaned';
  }[] = [
    { collection: 'songs', filter: { $or: [{ youtubeId: { $exists: true } }, { youtubeUrl: { $exists: true } }] }, unset: { youtubeId: '', youtubeUrl: '' }, key: 'songsCleaned' },
    { collection: 'genres', filter: { $or: [{ songList: { $exists: true } }, { songCount: { $exists: true } }] }, unset: { songList: '', songCount: '' }, key: 'genresCleaned' },
    { collection: 'artists', filter: { genres: { $exists: true } }, unset: { genres: '' }, key: 'artistsCleaned' },
    { collection: 'playlists', filter: { songCount: { $exists: true } }, unset: { songCount: '' }, key: 'playlistsCleaned' },
  ];

  for (const { collection, filter, unset, key } of cleanups) {
    const target = db.collection(collection);
    report[key] = apply
      ? (await target.updateMany(filter, { $unset: unset })).modifiedCount
      : await target.countDocuments(filter);
  }

  return report;
}

export async function migrate({ apply = false, exitProcess = true } = {}) {
  try {
    await mongoose.connect(buildMongoUri(env.MONGODB_URI, 'Musicify'));
    const report = await normalizeCatalog(mongoose.connection.db!, { apply });

    console.log(JSON.stringify(report, null, 2));
    if (!apply) console.log('\nDry run only. Back up the database, then re-run with --apply to make these changes.');
    return report;
  } finally {
    await mongoose.disconnect();
    if (exitProcess) process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate({ apply: process.argv.includes('--apply') });
}
