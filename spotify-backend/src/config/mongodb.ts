import mongoose from 'mongoose';
import { env } from '../env.js';
import { logger } from '../lib/logger.js';

export const buildMongoUri = (baseUri: string | undefined, defaultDbName: string): string => {
  if (!baseUri) throw new Error('MONGODB_URI is required');

  const [withoutQuery = '', query] = baseUri.split('?');
  const cleaned = withoutQuery.replace(/\/+$/, '');

  const afterScheme = cleaned.replace(/^mongodb(\+srv)?:\/\//, '');
  const slashIndex = afterScheme.indexOf('/');
  const hasDbName = slashIndex !== -1 && afterScheme.slice(slashIndex + 1).length > 0;

  if (hasDbName) return baseUri;

  const uriWithDb = `${cleaned}/${defaultDbName}`;
  return query ? `${uriWithDb}?${query}` : uriWithDb;
};

const getDb = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB is not connected');
  }
  return mongoose.connection.db;
};

export const listDbCollections = async (): Promise<string[]> => {
  const collections = await getDb().listCollections().toArray();
  return collections.map((c) => c.name).sort();
};

export const getDbInfo = async () => {
  const db = getDb();
  const collections = await listDbCollections();
  const counts: Record<string, number> = {};
  for (const name of collections) {
    counts[name] = await db.collection(name).estimatedDocumentCount();
  }

  return {
    dbName: db.databaseName,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    readyState: mongoose.connection.readyState,
    collections,
    counts,
  };
};

const connectDB = async () => {
  mongoose.connection.on('connected', () => {
    logger.info(
      `MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`
    );
  });

  await mongoose.connect(buildMongoUri(env.MONGODB_URI, 'Musicify'));
};

export default connectDB;
