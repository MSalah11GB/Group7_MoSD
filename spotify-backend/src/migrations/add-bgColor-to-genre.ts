import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { env } from '../env.js';
import { buildMongoUri } from '../config/mongodb.js';
import genreModel from '../models/genreModel.js';

export async function migrate({ exitProcess = true } = {}) {
  try {
    await mongoose.connect(buildMongoUri(env.MONGODB_URI, 'Musicify'));

    const result = await genreModel.updateMany(
      { bgColor: { $exists: false } },
      { $set: { bgColor: '#000000' } }
    );

    console.log('Migration complete:', result.modifiedCount, 'documents updated');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    if (exitProcess) process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate();
}
