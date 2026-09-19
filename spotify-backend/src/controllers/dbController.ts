import type { RequestHandler } from 'express';
import { getDbInfo, listDbCollections } from '../config/mongodb.js';

export const listCollections: RequestHandler = async (_req, res) => {
  res.json({ success: true, collections: await listDbCollections() });
};

export const dbInfo: RequestHandler = async (_req, res) => {
  res.json({ success: true, ...(await getDbInfo()) });
};
