import express from 'express';
import { createPlaylist, listPlaylists, getPlaylist, updatePlaylist,
    deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, reorderSongs
} from '../controllers/playlistController.js';
import upload from '../middleware/multer.js';

const playlistRouter = express.Router();

playlistRouter.post('/create', upload.single('image'), createPlaylist);
playlistRouter.get('/list', listPlaylists);
playlistRouter.get('/get', getPlaylist);
playlistRouter.post('/update', upload.single('image'), updatePlaylist);
playlistRouter.post('/delete', deletePlaylist);
playlistRouter.post('/add-song', addSongToPlaylist);
playlistRouter.post('/remove-song', removeSongFromPlaylist);
playlistRouter.post('/reorder-songs', reorderSongs);

export default playlistRouter;