import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { HttpError } from '../lib/HttpError.js';

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '');
    callback(null, `upload_${crypto.randomUUID()}${ext}`);
  },
});

// Only small cover images pass through this server (playlist covers). Songs, album art and
// artist photos are uploaded by the admin directly to Cloudinary using a signed request.
const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === 'image' && file.mimetype.startsWith('image/')) return callback(null, true);
    callback(new HttpError(422, `Unsupported file for field "${file.fieldname}"`));
  },
});

export const imageUpload = upload.single('image');

/** Parses multipart text fields (what the admin forms send) and rejects any attached file. */
export const fieldsOnly = upload.none();

/** Deletes any multer temp files once the response is finished, whatever the outcome. */
export const cleanupTempFiles: RequestHandler = (req, res, next) => {
  res.on('close', () => {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files) files.push(...Object.values(req.files).flat());
    for (const file of files) fs.unlink(file.path).catch(() => {});
  });
  next();
};
