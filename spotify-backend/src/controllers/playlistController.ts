import type { RequestHandler } from 'express';
import { toPage } from '../lib/pagination.js';
import { currentUserId } from '../middleware/auth.js';
import { idBody } from '../schemas/common.js';
import {
  createPlaylistBody,
  getPlaylistQuery,
  listPlaylistsQuery,
  playlistSongBody,
  reorderSongsBody,
  updatePlaylistBody,
} from '../schemas/playlistSchemas.js';
import * as playlists from '../services/playlistService.js';

export const createPlaylist: RequestHandler = async (req, res) => {
  const body = createPlaylistBody.parse(req.body);
  const playlist = await playlists.createPlaylist(currentUserId(req), body, req.file);
  res.status(201).json({ success: true, message: 'Playlist created successfully', playlist });
};

export const listPlaylists: RequestHandler = async (req, res) => {
  const query = listPlaylistsQuery.parse(req.query);
  const result = await playlists.listPlaylists(req.userId, query, toPage(query));
  res.json({ success: true, ...result });
};

export const getPlaylist: RequestHandler = async (req, res) => {
  const { id } = getPlaylistQuery.parse(req.query);
  res.json({ success: true, playlist: await playlists.getPlaylist(id, req.userId) });
};

export const updatePlaylist: RequestHandler = async (req, res) => {
  const body = updatePlaylistBody.parse(req.body);
  const playlist = await playlists.updatePlaylist(currentUserId(req), body, req.file);
  res.json({ success: true, message: 'Playlist updated successfully', playlist });
};

export const deletePlaylist: RequestHandler = async (req, res) => {
  const { id } = idBody.parse(req.body);
  await playlists.deletePlaylist(currentUserId(req), id);
  res.json({ success: true, message: 'Playlist deleted successfully' });
};

export const addSongToPlaylist: RequestHandler = async (req, res) => {
  const { playlistId, songId } = playlistSongBody.parse(req.body);
  await playlists.addSongToPlaylist(currentUserId(req), playlistId, songId);
  res.json({ success: true, message: 'Song added to playlist successfully' });
};

export const removeSongFromPlaylist: RequestHandler = async (req, res) => {
  const { playlistId, songId } = playlistSongBody.parse(req.body);
  await playlists.removeSongFromPlaylist(currentUserId(req), playlistId, songId);
  res.json({ success: true, message: 'Song removed from playlist successfully' });
};

export const reorderSongs: RequestHandler = async (req, res) => {
  const { playlistId, songIds } = reorderSongsBody.parse(req.body);
  await playlists.reorderPlaylistSongs(currentUserId(req), playlistId, songIds);
  res.json({ success: true, message: 'Songs reordered successfully' });
};
