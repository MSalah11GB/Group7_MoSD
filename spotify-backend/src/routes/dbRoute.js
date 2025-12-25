import express from 'express';
import { listCollections } from '../controllers/dbController.js';

const dbRouter = express.Router();

dbRouter.get('/collections', listCollections);

export default dbRouter;
