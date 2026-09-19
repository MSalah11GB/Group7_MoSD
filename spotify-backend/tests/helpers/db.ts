import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { inject } from 'vitest';

/** Connects to a fresh, uniquely named database so test files can run in parallel. */
export const connectTestDb = async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${crypto.randomUUID().slice(0, 8)}` });
};

export const disconnectTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

export const clearTestDb = async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};
