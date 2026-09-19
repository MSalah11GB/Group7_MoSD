import { z } from 'zod';
import {
  albumRef,
  boolish,
  hexColor,
  objectId,
  objectIdList,
  publicId,
  requiredText,
  stringList,
} from './common.js';

export { listQuery } from './common.js';

export const addAlbumBody = z.object({
  name: requiredText('Album name'),
  desc: requiredText('Album description', 1000),
  bgColor: hexColor,
  imagePublicId: publicId,
});

export const updateAlbumBody = z.object({
  id: objectId,
  name: requiredText('Album name').optional(),
  desc: requiredText('Album description', 1000).optional(),
  bgColor: hexColor.optional(),
  imagePublicId: publicId.optional(),
});

export const removeAlbumBody = z.object({
  id: objectId,
  confirmed: boolish.optional(),
});

export const addArtistBody = z.object({
  name: requiredText('Artist name'),
  bgColor: hexColor,
  imagePublicId: publicId,
});

export const updateArtistBody = z.object({
  id: objectId,
  name: requiredText('Artist name'),
  bgColor: hexColor.optional(),
  imagePublicId: publicId.optional(),
});

export const addGenreBody = z.object({
  name: requiredText('Genre name'),
  bgColor: hexColor,
});

export const updateGenreBody = z.object({
  id: objectId,
  name: requiredText('Genre name'),
  bgColor: hexColor.optional(),
});

export const listGenreQuery = z.object({
  id: objectId.optional(),
  includeSongs: boolish.optional(),
});

const spotifyImage = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://i.scdn.co/'), 'Image URL must come from Spotify');

const songFields = {
  albumId: albumRef.optional(),
  artists: stringList.pipe(z.array(objectId)),
  artist: stringList.pipe(z.array(objectId)),
  genres: objectIdList,
  newGenres: stringList,
  useAlbumImage: boolish.optional(),
  imagePublicId: publicId.optional(),
  imageUrl: spotifyImage.optional(),
  audioPublicId: publicId.optional(),
  lrcPublicId: publicId.optional(),
};

export const addSongBody = z.object({
  ...songFields,
  name: requiredText('Song name'),
});

export const updateSongBody = z.object({
  ...songFields,
  id: objectId,
  name: requiredText('Song name'),
});

export const spotifyLookupBody = z.object({
  spotifyUrl: requiredText('Spotify URL', 500),
});

export const signUploadBody = z.object({
  kind: z.enum(['image', 'audio', 'lrc']),
});
