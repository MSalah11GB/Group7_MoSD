import { Types } from 'mongoose';
import songModel, { ALBUM_POPULATE } from '../models/songModel.js';
import artistModel from '../models/artistModel.js';
import albumModel from '../models/albumModel.js';
import playlistModel from '../models/playlistModel.js';
import { HttpError, notFound } from '../lib/HttpError.js';
import { applyPage, pageMeta, type Page } from '../lib/pagination.js';
import { escapeRegex } from '../utils/regexUtils.js';
import { extractSpotifyTrackId, getSpotifyTrackInfo } from '../utils/spotify.js';
import { resolveNewGenres } from './genreService.js';
import { deleteAssets, getUploaded } from './mediaService.js';

type SongInput = {
  albumId?: string | null;
  artists: string[];
  artist: string[];
  genres: string[];
  newGenres: string[];
  useAlbumImage?: boolean;
  imagePublicId?: string;
  imageUrl?: string;
  audioPublicId?: string;
  lrcPublicId?: string;
};

export type AddSongInput = SongInput & { name: string };
export type UpdateSongInput = SongInput & { id: string; name: string };

const unique = (items: string[]) => [...new Set(items)];

const artistIdsOf = (input: SongInput) => {
  const ids = unique(input.artists.length ? input.artists : input.artist);
  if (ids.length === 0) throw new HttpError(422, 'At least one artist is required');
  return ids;
};

const getArtistNames = async (artistIds: string[]) => {
  const docs = await artistModel.find({ _id: { $in: artistIds } }, 'name');
  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc.name]));
  if (byId.size !== artistIds.length) throw new HttpError(422, 'One or more artists were not found');
  return artistIds.map((id) => byId.get(id)!).join(', ');
};

const findAlbum = async (albumId: string | null | undefined) => {
  if (!albumId) return null;
  const album = await albumModel.findById(albumId, 'image');
  if (!album) throw new HttpError(422, 'Album not found');
  return album;
};

export const listSongs = async (search: string | undefined, page: Page | undefined) => {
  const filter: Record<string, unknown> = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { artistName: { $regex: escapeRegex(search), $options: 'i' } },
          // The album name lives on the album, so match songs whose album name matches too.
          {
            albumId: {
              $in: await albumModel.distinct('_id', {
                name: { $regex: escapeRegex(search), $options: 'i' },
              }),
            },
          },
        ],
      }
    : {};

  const [songs, total] = await Promise.all([
    applyPage(
      songModel
        .find(filter)
        .populate('artist', 'name image')
        .populate('genres', 'name')
        .populate(ALBUM_POPULATE)
        .sort({ _id: -1 }),
      page
    ),
    page ? songModel.countDocuments(filter) : Promise.resolve(0),
  ]);
  return { songs, ...pageMeta(page, total) };
};

export const addSong = async (input: AddSongInput) => {
  const artistIds = artistIdsOf(input);
  if (!input.audioPublicId) throw new HttpError(422, 'Audio file is required');

  const album = await findAlbum(input.albumId);
  const artistName = await getArtistNames(artistIds);

  let image: string;
  if (input.useAlbumImage) {
    if (!album?.image) throw new HttpError(422, 'Album image not found');
    image = album.image;
  } else if (input.imagePublicId) {
    image = (await getUploaded(input.imagePublicId, 'image')).url;
  } else if (input.imageUrl) {
    image = input.imageUrl;
  } else {
    throw new HttpError(422, 'Image is required');
  }

  const audio = await getUploaded(input.audioPublicId, 'audio');
  const lrc = input.lrcPublicId ? await getUploaded(input.lrcPublicId, 'lrc') : undefined;
  const genres = unique([...input.genres, ...(await resolveNewGenres(input.newGenres))]);

  return songModel.create({
    name: input.name,
    artist: artistIds.map((id) => new Types.ObjectId(id)),
    artistName,
    albumId: album?._id ?? null,
    image,
    file: audio.url,
    duration: audio.duration ?? '0:00',
    lrcFile: lrc?.url ?? '',
    genres: genres.map((id) => new Types.ObjectId(id)),
  });
};

export const updateSong = async (input: UpdateSongInput) => {
  const current = await songModel.findById(input.id);
  if (!current) throw notFound('Song');

  const artistIds = artistIdsOf(input);
  const update: Record<string, unknown> = {
    name: input.name,
    artist: artistIds,
    artistName: await getArtistNames(artistIds),
    genres: unique([...input.genres, ...(await resolveNewGenres(input.newGenres))]),
  };

  if (input.albumId !== undefined) update.albumId = (await findAlbum(input.albumId))?._id ?? null;

  if (input.useAlbumImage) {
    const album = await findAlbum(input.albumId === undefined ? current.albumId?.toString() : input.albumId);
    if (!album?.image) throw new HttpError(422, 'Album image not found');
    update.image = album.image;
  } else if (input.imagePublicId) {
    update.image = (await getUploaded(input.imagePublicId, 'image')).url;
  }

  if (input.audioPublicId) {
    const audio = await getUploaded(input.audioPublicId, 'audio');
    update.file = audio.url;
    update.duration = audio.duration ?? current.duration;
  }
  if (input.lrcPublicId) update.lrcFile = (await getUploaded(input.lrcPublicId, 'lrc')).url;

  await songModel.findByIdAndUpdate(input.id, update);

  // Audio and lyrics belong to this song alone (images may be shared with albums), so replaced ones can go.
  await deleteAssets([
    update.file && update.file !== current.file ? current.file : undefined,
    update.lrcFile && update.lrcFile !== current.lrcFile ? current.lrcFile : undefined,
  ]);
};

/** Deletes songs, their audio/lyrics assets, and their entries in every playlist. */
export const removeSongsByIds = async (ids: string[]) => {
  if (ids.length === 0) return;

  const songs = await songModel.find({ _id: { $in: ids } }, 'file lrcFile');

  await playlistModel.updateMany(
    { songs: { $in: ids } },
    { $pull: { songs: { $in: ids.map((id) => new Types.ObjectId(id)) } } }
  );
  await songModel.deleteMany({ _id: { $in: ids } });

  await deleteAssets(songs.flatMap((song) => [song.file, song.lrcFile]));
};

export const removeSong = async (id: string) => {
  if (!(await songModel.exists({ _id: id }))) throw notFound('Song');
  await removeSongsByIds([id]);
};

/** Looks up track details so the admin can prefill the form; nothing is created or downloaded. */
export const lookupSpotifyTrack = async (spotifyUrl: string) => {
  const trackId = extractSpotifyTrackId(spotifyUrl);
  if (!trackId) throw new HttpError(422, 'Invalid Spotify URL');
  return getSpotifyTrackInfo(trackId);
};
