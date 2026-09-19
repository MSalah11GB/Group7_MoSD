import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { cleanupTempFiles } from './middleware/upload.js';
import { apiRouter } from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cleanupTempFiles);
  app.use(clerkMiddleware());

  app.get('/', (_req, res) => {
    res.send('API Working');
  });
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
