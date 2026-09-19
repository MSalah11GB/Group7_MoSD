import type { RequestHandler } from 'express';
import { toPage } from '../lib/pagination.js';
import { idBody } from '../schemas/common.js';
import {
  addAlbumBody,
  addArtistBody,
  addGenreBody,
  addSongBody,
  listGenreQuery,
  listQuery,
  removeAlbumBody,
  signUploadBody,
  spotifyLookupBody,
  updateAlbumBody,
  updateArtistBody,
  updateGenreBody,
  updateSongBody,
} from '../schemas/catalogSchemas.js';
import * as albums from '../services/albumService.js';
import * as artists from '../services/artistService.js';
import * as genres from '../services/genreService.js';
import { signUpload } from '../services/mediaService.js';
import * as songs from '../services/songService.js';

// Uploads
export const signUploadRequest: RequestHandler = (req, res) => {
  const { kind } = signUploadBody.parse(req.body);
  res.json({ success: true, ...signUpload(kind) });
};

// Albums
export const addAlbum: RequestHandler = async (req, res) => {
  await albums.createAlbum(addAlbumBody.parse(req.body));
  res.status(201).json({ success: true, message: 'Album added' });
};

export const listAlbum: RequestHandler = async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ success: true, ...(await albums.listAlbums(query.search, toPage(query))) });
};

export const updateAlbum: RequestHandler = async (req, res) => {
  await albums.updateAlbum(updateAlbumBody.parse(req.body));
  res.json({ success: true, message: 'Album updated' });
};

export const removeAlbum: RequestHandler = async (req, res) => {
  const { id, confirmed } = removeAlbumBody.parse(req.body);
  const { message, ...result } = await albums.removeAlbum(id, confirmed ?? false);
  res.json({ success: true, message, ...result });
};

// Artists
export const addArtist: RequestHandler = async (req, res) => {
  await artists.createArtist(addArtistBody.parse(req.body));
  res.status(201).json({ success: true, message: 'Artist added successfully' });
};

export const listArtist: RequestHandler = async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ success: true, ...(await artists.listArtists(query.search, toPage(query))) });
};

export const updateArtist: RequestHandler = async (req, res) => {
  await artists.updateArtist(updateArtistBody.parse(req.body));
  res.json({ success: true, message: 'Artist updated successfully' });
};

export const removeArtist: RequestHandler = async (req, res) => {
  await artists.removeArtist(idBody.parse(req.body).id);
  res.json({ success: true, message: 'Artist deleted successfully' });
};

// Genres
export const addGenre: RequestHandler = async (req, res) => {
  const genre = await genres.createGenre(addGenreBody.parse(req.body));
  res.status(201).json({ success: true, message: 'Genre added successfully', genre });
};

export const listGenre: RequestHandler = async (req, res) => {
  res.json({ success: true, genres: await genres.listGenres(listGenreQuery.parse(req.query)) });
};

export const updateGenre: RequestHandler = async (req, res) => {
  await genres.updateGenre(updateGenreBody.parse(req.body));
  res.json({ success: true, message: 'Genre updated successfully' });
};

export const removeGenre: RequestHandler = async (req, res) => {
  const { songs: songCount } = await genres.removeGenre(idBody.parse(req.body).id);
  res.json({ success: true, message: `Genre removed and removed from ${songCount} songs` });
};

// Songs
export const addSong: RequestHandler = async (req, res) => {
  await songs.addSong(addSongBody.parse(req.body));
  res.status(201).json({ success: true, message: 'Song Added' });
};

export const listSong: RequestHandler = async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ success: true, ...(await songs.listSongs(query.search, toPage(query))) });
};

export const updateSong: RequestHandler = async (req, res) => {
  await songs.updateSong(updateSongBody.parse(req.body));
  res.json({ success: true, message: 'Song updated' });
};

export const removeSong: RequestHandler = async (req, res) => {
  await songs.removeSong(idBody.parse(req.body).id);
  res.json({ success: true, message: 'Song removed successfully' });
};

export const spotifyMetadata: RequestHandler = async (req, res) => {
  const { spotifyUrl } = spotifyLookupBody.parse(req.body);
  res.json({ success: true, track: await songs.lookupSpotifyTrack(spotifyUrl) });
};
