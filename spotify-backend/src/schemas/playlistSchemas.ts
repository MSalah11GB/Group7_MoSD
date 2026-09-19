import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.js';
import { boolish, objectId, requiredText, searchQuery } from './common.js';

export const createPlaylistBody = z.object({
  name: requiredText('Playlist name', 100),
  description: z.string().trim().max(500).default(''),
  isPublic: boolish.default(true),
});

export const updatePlaylistBody = z.object({
  id: objectId,
  name: z.string().trim().min(1, 'Playlist name is required').max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isPublic: boolish.optional(),
});

export const listPlaylistsQuery = searchQuery.extend(paginationQuery.shape).extend({ mine: boolish.optional() });

export const getPlaylistQuery = z.object({ id: objectId });

export const playlistSongBody = z.object({ playlistId: objectId, songId: objectId });

export const reorderSongsBody = z.object({
  playlistId: objectId,
  songIds: z.array(objectId, { error: 'Song IDs array is required' }),
});
