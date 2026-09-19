import genreModel from '../models/genreModel.js';
import songModel, { ALBUM_POPULATE } from '../models/songModel.js';
import { HttpError, notFound } from '../lib/HttpError.js';
import { executeTransaction } from '../utils/transactionUtils.js';

/** Lowercases and strips punctuation/whitespace so "Hip-Hop" and "hip hop" count as duplicates. */
export const normalizeGenreName = (name: string | undefined | null): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();
};

const findDuplicate = async (name: string, excludeId?: string) => {
  const normalized = normalizeGenreName(name);
  if (normalized === '') {
    throw new HttpError(422, 'Genre name must contain at least one alphanumeric character');
  }

  const filter = excludeId ? { _id: { $ne: excludeId } } : {};
  const genres = await genreModel.find(filter, 'name');
  return genres.find((genre) => normalizeGenreName(genre.name) === normalized) ?? null;
};

const duplicateError = () =>
  new HttpError(409, 'A genre with this name already exists', { isDuplicate: true });

export const createGenre = async (input: { name: string; bgColor: string }) => {
  if (await findDuplicate(input.name)) throw duplicateError();
  return genreModel.create({ name: input.name, bgColor: input.bgColor });
};

/**
 * A genre's songs are the songs that list it, so the count and (optionally) the song list are
 * computed from the songs collection instead of being stored on the genre.
 */
export const listGenres = async (options: { id?: string; includeSongs?: boolean }) => {
  const genres = await genreModel.find(options.id ? { _id: options.id } : {}).sort({ name: 1 });
  const ids = genres.map((genre) => genre._id);

  const counts = new Map<string, number>();
  const songLists = new Map<string, unknown[]>();

  if (options.includeSongs) {
    const songs = await songModel.find({ genres: { $in: ids } }).populate(ALBUM_POPULATE);
    for (const song of songs) {
      for (const genreId of song.genres.map(String)) {
        songLists.set(genreId, [...(songLists.get(genreId) ?? []), song]);
        counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
      }
    }
  } else {
    const rows = await songModel.aggregate<{ _id: unknown; songCount: number }>([
      { $match: { genres: { $in: ids } } },
      { $unwind: '$genres' },
      { $match: { genres: { $in: ids } } },
      { $group: { _id: '$genres', songCount: { $sum: 1 } } },
    ]);
    for (const row of rows) counts.set(String(row._id), row.songCount);
  }

  return genres.map((genre) => {
    const id = genre._id.toString();
    return {
      ...genre.toJSON(),
      songCount: counts.get(id) ?? 0,
      ...(options.includeSongs ? { songList: songLists.get(id) ?? [] } : {}),
    };
  });
};

export const updateGenre = async (input: { id: string; name: string; bgColor?: string }) => {
  if (!(await genreModel.exists({ _id: input.id }))) throw notFound('Genre');
  if (await findDuplicate(input.name, input.id)) throw duplicateError();

  const update: { name: string; bgColor?: string } = { name: input.name };
  if (input.bgColor) update.bgColor = input.bgColor;
  await genreModel.findByIdAndUpdate(input.id, update);
};

export const removeGenre = async (id: string) => {
  if (!(await genreModel.exists({ _id: id }))) throw notFound('Genre');

  return executeTransaction(async (session) => {
    const songs = await songModel.updateMany({ genres: id }, { $pull: { genres: id } }, { session });
    await genreModel.findByIdAndDelete(id, { session });
    return { songs: songs.modifiedCount };
  });
};

/** Resolves free-text genre names to ids, creating genres that don't exist yet. */
export const resolveNewGenres = async (names: string[]): Promise<string[]> => {
  const ids: string[] = [];
  if (names.length === 0) return ids;

  const existing = await genreModel.find({}, 'name');
  for (const raw of names) {
    const name = raw.trim();
    const normalized = normalizeGenreName(name);
    if (!normalized) continue;

    let genre = existing.find((g) => normalizeGenreName(g.name) === normalized);
    if (!genre) {
      genre = await genreModel.create({ name });
      existing.push(genre);
    }
    const id = genre._id.toString();
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
};
