import { Router } from 'express';
import { requireAdmin, requireAuth, optionalAuth } from '../middleware/auth.js';
import { fieldsOnly, imageUpload } from '../middleware/upload.js';
import { syncCurrentUser, whoAmI } from '../controllers/authController.js';
import { dbInfo, listCollections } from '../controllers/dbController.js';
import * as catalog from '../controllers/catalogControllers.js';
import * as playlist from '../controllers/playlistController.js';

const albumRouter = Router();
albumRouter.get('/list', catalog.listAlbum);
albumRouter.post('/add', requireAdmin, fieldsOnly, catalog.addAlbum);
albumRouter.post('/update', requireAdmin, fieldsOnly, catalog.updateAlbum);
albumRouter.post('/remove', requireAdmin, catalog.removeAlbum);

const artistRouter = Router();
artistRouter.get('/list', catalog.listArtist);
artistRouter.post('/add', requireAdmin, fieldsOnly, catalog.addArtist);
artistRouter.post('/update', requireAdmin, fieldsOnly, catalog.updateArtist);
artistRouter.post('/remove', requireAdmin, catalog.removeArtist);

const genreRouter = Router();
genreRouter.get('/list', catalog.listGenre);
genreRouter.post('/add', requireAdmin, fieldsOnly, catalog.addGenre);
genreRouter.post('/update', requireAdmin, catalog.updateGenre);
genreRouter.post('/remove', requireAdmin, catalog.removeGenre);

const songRouter = Router();
songRouter.get('/list', catalog.listSong);
songRouter.post('/add', requireAdmin, fieldsOnly, catalog.addSong);
songRouter.post('/update', requireAdmin, fieldsOnly, catalog.updateSong);
songRouter.post('/remove', requireAdmin, catalog.removeSong);
songRouter.post('/spotify-metadata', requireAdmin, catalog.spotifyMetadata);

const playlistRouter = Router();
playlistRouter.get('/list', optionalAuth, playlist.listPlaylists);
playlistRouter.get('/get', optionalAuth, playlist.getPlaylist);
playlistRouter.post('/create', requireAuth, imageUpload, playlist.createPlaylist);
playlistRouter.post('/update', requireAuth, imageUpload, playlist.updatePlaylist);
playlistRouter.post('/delete', requireAuth, playlist.deletePlaylist);
playlistRouter.post('/add-song', requireAuth, playlist.addSongToPlaylist);
playlistRouter.post('/remove-song', requireAuth, playlist.removeSongFromPlaylist);
playlistRouter.post('/reorder-songs', requireAuth, playlist.reorderSongs);

const uploadRouter = Router();
uploadRouter.post('/sign', requireAdmin, catalog.signUploadRequest);

const authRouter = Router();
authRouter.post('/sync', requireAuth, syncCurrentUser);
authRouter.get('/me', requireAuth, whoAmI);

const dbRouter = Router();
dbRouter.get('/collections', requireAdmin, listCollections);
dbRouter.get('/info', requireAdmin, dbInfo);

export const apiRouter = Router();
apiRouter.use('/album', albumRouter);
apiRouter.use('/artist', artistRouter);
apiRouter.use('/genre', genreRouter);
apiRouter.use('/song', songRouter);
apiRouter.use('/playlist', playlistRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/db', dbRouter);
