import playlistModel from '../models/playlistModel.js';
import songModel, { ALBUM_POPULATE } from '../models/songModel.js';
import { User } from '../models/userModel.js';
import { HttpError, notFound } from '../lib/HttpError.js';
import { applyPage, pageMeta, type Page } from '../lib/pagination.js';
import { escapeRegex } from '../utils/regexUtils.js';
import { uploadImageFile, type LocalFile } from './mediaService.js';
import { getOrCreateUser } from './userService.js';

const DEFAULT_PLAYLIST_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
const CREATOR_FIELDS = 'fullName imageURL clerkId';

const PRIVATE_MESSAGE = 'This playlist is private';

/** Loads a playlist and verifies that the given Clerk user created it. */
const findOwnedPlaylist = async (playlistId: string, clerkId: string, action: string) => {
  const playlist = await playlistModel.findById(playlistId);
  if (!playlist) throw notFound('Playlist');

  const user = await User.findOne({ clerkId }, '_id');
  if (!user || !playlist.creator.equals(user._id)) {
    throw new HttpError(403, `You don't have permission to ${action} this playlist`);
  }
  return playlist;
};

export const createPlaylist = async (
  clerkId: string,
  input: { name: string; description: string; isPublic: boolean },
  image: LocalFile | undefined
) => {
  const user = await getOrCreateUser(clerkId);
  return playlistModel.create({
    ...input,
    image: image ? await uploadImageFile(image) : DEFAULT_PLAYLIST_IMAGE,
    creator: user._id,
  });
};

/** Public playlists, plus the viewer's own private ones when signed in. */
export const listPlaylists = async (
  viewerClerkId: string | undefined,
  options: { search?: string; mine?: boolean },
  page: Page | undefined
) => {
  const viewer = viewerClerkId ? await User.findOne({ clerkId: viewerClerkId }, '_id') : null;

  if (options.mine && !viewer) throw new HttpError(401, 'Unauthorized - you must be logged in');

  const clauses: Record<string, unknown>[] = [];
  if (options.mine && viewer) {
    clauses.push({ creator: viewer._id });
  } else if (viewer) {
    clauses.push({ $or: [{ isPublic: { $ne: false } }, { creator: viewer._id }] });
  } else {
    clauses.push({ isPublic: { $ne: false } });
  }

  if (options.search) {
    const regex = { $regex: escapeRegex(options.search), $options: 'i' };
    clauses.push({ $or: [{ name: regex }, { description: regex }] });
  }

  const filter = { $and: clauses };
  const [playlists, total] = await Promise.all([
    applyPage(
      playlistModel.find(filter).populate('creator', CREATOR_FIELDS).sort({ updatedAt: -1 }),
      page
    ),
    page ? playlistModel.countDocuments(filter) : Promise.resolve(0),
  ]);
  return { playlists, ...pageMeta(page, total) };
};

export const getPlaylist = async (id: string, viewerClerkId: string | undefined) => {
  const playlist = await playlistModel
    .findById(id)
    .populate({
      path: 'songs',
      select: '_id name artist artistName albumId image file duration lrcFile',
      populate: ALBUM_POPULATE,
    })
    .populate<{ creator: { clerkId: string } | null }>('creator', CREATOR_FIELDS);

  if (!playlist) throw notFound('Playlist');

  if (playlist.isPublic === false && playlist.creator?.clerkId !== viewerClerkId) {
    throw new HttpError(403, PRIVATE_MESSAGE);
  }

  // Songs deleted after being added populate as null; hide them without writing on GET.
  const songs = playlist.toJSON().songs.filter(Boolean);
  return { ...playlist.toJSON(), songs, songCount: songs.length };
};

export const updatePlaylist = async (
  clerkId: string,
  input: { id: string; name?: string; description?: string; isPublic?: boolean },
  image: LocalFile | undefined
) => {
  const playlist = await findOwnedPlaylist(input.id, clerkId, 'update');

  if (input.name !== undefined) playlist.name = input.name;
  if (input.description !== undefined) playlist.description = input.description;
  if (input.isPublic !== undefined) playlist.isPublic = input.isPublic;
  if (image) playlist.image = await uploadImageFile(image);

  return playlist.save();
};

export const deletePlaylist = async (clerkId: string, id: string) => {
  const playlist = await findOwnedPlaylist(id, clerkId, 'delete');
  await playlist.deleteOne();
};

export const addSongToPlaylist = async (clerkId: string, playlistId: string, songId: string) => {
  const playlist = await findOwnedPlaylist(playlistId, clerkId, 'modify');

  if (!(await songModel.exists({ _id: songId }))) throw notFound('Song');
  if (playlist.songs.some((id) => id.toString() === songId)) {
    throw new HttpError(409, 'Song is already in the playlist');
  }

  playlist.songs.push(songId as unknown as (typeof playlist.songs)[number]);
  await playlist.save();
};

export const removeSongFromPlaylist = async (clerkId: string, playlistId: string, songId: string) => {
  const playlist = await findOwnedPlaylist(playlistId, clerkId, 'modify');

  const index = playlist.songs.findIndex((id) => id.toString() === songId);
  if (index === -1) throw new HttpError(404, 'Song is not in the playlist');

  playlist.songs.splice(index, 1);
  await playlist.save();
};

export const reorderPlaylistSongs = async (clerkId: string, playlistId: string, songIds: string[]) => {
  const playlist = await findOwnedPlaylist(playlistId, clerkId, 'modify');

  const current = playlist.songs.map(String).sort();
  const requested = [...songIds].sort();
  if (current.length !== requested.length || current.some((id, i) => id !== requested[i])) {
    throw new HttpError(422, 'Invalid song IDs provided for reordering');
  }

  playlist.songs = songIds as unknown as typeof playlist.songs;
  await playlist.save();
};
