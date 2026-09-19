import albumModel from '../models/albumModel.js';
import songModel from '../models/songModel.js';
import { notFound } from '../lib/HttpError.js';
import { applyPage, pageMeta, type Page } from '../lib/pagination.js';
import { escapeRegex } from '../utils/regexUtils.js';
import { getUploaded } from './mediaService.js';
import { removeSongsByIds } from './songService.js';

export const listAlbums = async (search: string | undefined, page: Page | undefined) => {
  const regex = search ? { $regex: escapeRegex(search), $options: 'i' } : undefined;
  const filter = regex ? { $or: [{ name: regex }, { desc: regex }] } : {};

  const [albums, total] = await Promise.all([
    applyPage(albumModel.find(filter).sort({ _id: 1 }), page),
    page ? albumModel.countDocuments(filter) : Promise.resolve(0),
  ]);
  return { albums, ...pageMeta(page, total) };
};

export const createAlbum = async (input: {
  name: string;
  desc: string;
  bgColor: string;
  imagePublicId: string;
}) => {
  const image = await getUploaded(input.imagePublicId, 'image');
  return albumModel.create({
    name: input.name,
    desc: input.desc,
    bgColor: input.bgColor,
    image: image.url,
  });
};

export const updateAlbum = async (input: {
  id: string;
  name?: string;
  desc?: string;
  bgColor?: string;
  imagePublicId?: string;
}) => {
  const { id, imagePublicId, ...fields } = input;
  const update: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) update[key] = value;
  }
  if (imagePublicId) update.image = (await getUploaded(imagePublicId, 'image')).url;

  const album = await albumModel.findByIdAndUpdate(id, update);
  if (!album) throw notFound('Album');
};

/**
 * Deleting an album deletes its songs, so the first call (confirmed=false) only reports
 * how many songs would be lost; the caller must repeat it with confirmed=true.
 */
export const removeAlbum = async (id: string, confirmed: boolean) => {
  const album = await albumModel.findById(id);
  if (!album) throw notFound('Album');

  const songs = await songModel.find({ albumId: album._id }, '_id');

  if (!confirmed) {
    return {
      requiresConfirmation: true as const,
      songCount: songs.length,
      message: `This will delete the album and ${songs.length} song(s) associated with it.`,
    };
  }

  await removeSongsByIds(songs.map((song) => song._id.toString()));
  await albumModel.findByIdAndDelete(id);

  return {
    requiresConfirmation: false as const,
    deletedSongs: songs.length,
    message: `Album deleted along with ${songs.length} song(s)`,
  };
};
