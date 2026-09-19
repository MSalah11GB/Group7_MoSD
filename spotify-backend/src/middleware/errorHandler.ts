import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../lib/HttpError.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message, ...err.extra });
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(422).json({
      success: false,
      message: issues[0]?.message ?? 'Validation failed',
      errors: issues,
    });
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? 'Uploaded file is too large' : err.message,
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(422).json({ success: false, message: err.message });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate value' });
  }

  // body-parser and similar middleware errors carry a client-safe 4xx status
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500 && err.expose) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  return res.status(500).json({ success: false, message: 'Internal server error' });
};
