import express from 'express';
import { dbInfo, listCollections } from '../controllers/dbController.js';

const dbRouter = express.Router();

dbRouter.get('/collections', listCollections);
dbRouter.get('/info', dbInfo);

export default dbRouter;
