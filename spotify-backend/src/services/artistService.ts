import artistModel from '../models/artistModel.js';
import songModel from '../models/songModel.js';
import { HttpError, notFound } from '../lib/HttpError.js';
import { applyPage, pageMeta, type Page } from '../lib/pagination.js';
import { escapeRegex } from '../utils/regexUtils.js';
import { getUploaded } from './mediaService.js';

const duplicateError = () =>
  new HttpError(409, 'An artist with this name already exists', { isDuplicate: true });

const nameTaken = (name: string, excludeId?: string) =>
  artistModel.exists({
    name: new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, 'i'),
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

/** An artist's genres are the genres of their songs, computed on read rather than stored. */
export const listArtists = async (search: string | undefined, page: Page | undefined) => {
  const filter = search ? { name: { $regex: escapeRegex(search), $options: 'i' } } : {};

  const [artists, total] = await Promise.all([
    applyPage(artistModel.find(filter).sort({ _id: 1 }), page),
    page ? artistModel.countDocuments(filter) : Promise.resolve(0),
  ]);

  const ids = artists.map((artist) => artist._id);
  const rows = await songModel.aggregate<{ _id: unknown; genres: unknown[] }>([
    { $match: { artist: { $in: ids } } },
    { $unwind: '$artist' },
    { $match: { artist: { $in: ids } } },
    { $unwind: '$genres' },
    { $group: { _id: '$artist', genres: { $addToSet: '$genres' } } },
  ]);
  const genresByArtist = new Map(rows.map((row) => [String(row._id), row.genres]));

  return {
    artists: artists.map((artist) => ({
      ...artist.toJSON(),
      genres: genresByArtist.get(artist._id.toString()) ?? [],
    })),
    ...pageMeta(page, total),
  };
};

export const createArtist = async (input: { name: string; bgColor: string; imagePublicId: string }) => {
  if (await nameTaken(input.name)) throw duplicateError();
  const image = await getUploaded(input.imagePublicId, 'image');
  return artistModel.create({ name: input.name, bgColor: input.bgColor, image: image.url });
};

export const updateArtist = async (input: {
  id: string;
  name: string;
  bgColor?: string;
  imagePublicId?: string;
}) => {
  const artist = await artistModel.findById(input.id);
  if (!artist) throw notFound('Artist');
  if (await nameTaken(input.name, input.id)) throw duplicateError();

  artist.name = input.name;
  if (input.bgColor) artist.bgColor = input.bgColor;
  if (input.imagePublicId) artist.image = (await getUploaded(input.imagePublicId, 'image')).url;
  await artist.save();
};

export const removeArtist = async (id: string) => {
  const songCount = await songModel.countDocuments({ artist: id });
  if (songCount > 0) {
    throw new HttpError(
      409,
      'Cannot delete artist because there are songs associated with them. Please delete those songs first.',
      { hasSongs: true, songCount }
    );
  }

  const deleted = await artistModel.findByIdAndDelete(id);
  if (!deleted) throw notFound('Artist');
};
