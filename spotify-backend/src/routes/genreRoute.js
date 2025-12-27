import express from 'express';
import { addGenre, listGenre, removeGenre, updateGenre } from '../controllers/genreController.js';
import upload from '../middleware/multer.js';

const genreRouter = express.Router();

genreRouter.post('/add', upload.single('image'), addGenre);
genreRouter.get('/list', listGenre);
genreRouter.post('/remove', removeGenre);
genreRouter.post('/update', updateGenre);

export default genreRouter;
