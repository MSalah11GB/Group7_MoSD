import mongoose from 'mongoose';
import { assertRequiredEnv, env } from './env.js';
import { logger } from './lib/logger.js';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import { countLegacySongs } from './migrations/002-normalize-catalog.js';
import { createApp } from './app.js';

const warnAboutUnmigratedData = async () => {
  const legacy = await countLegacySongs(mongoose.connection.db!);
  if (legacy > 0) {
    logger.warn(
      `${legacy} song(s) still use the old schema, so their albums will show as "none". ` +
        'Back up the database, then run (inside spotify-backend): npm run migrate:normalize -- --apply'
    );
  }
};

const start = async () => {
  assertRequiredEnv();
  await connectDB();
  connectCloudinary();
  await warnAboutUnmigratedData();

  const server = createApp().listen(env.PORT, () => {
    logger.info(`Server started on ${env.PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
