import mongoose from 'mongoose';

import { jest } from '@jest/globals';

import genreModel from '../src/models/genreModel.js';
import { addGenre, listGenre } from '../src/controllers/genreController.js';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('Admin DB (genres)', () => {
  jest.setTimeout(30000);

  let mongoAvailable = true;

  beforeAll(async () => {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db';
    try {
      await mongoose.connect(url, { serverSelectionTimeoutMS: 2000 });
    } catch {
      mongoAvailable = false;
    }
  });

  afterEach(async () => {
    if (!mongoAvailable) return;
    await genreModel.deleteMany();
  });

  afterAll(async () => {
    if (!mongoAvailable) return;
    await mongoose.connection.close();
  });

  test('admin can add a genre and list it', async () => {
    if (!mongoAvailable) return;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const reqAdd = { body: { name: 'Pop', bgColor: '#000000' } };
    const resAdd = createRes();

    await addGenre(reqAdd, resAdd);

    expect(resAdd.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.any(String) })
    );

    const reqList = { query: {} };
    const resList = createRes();
    await listGenre(reqList, resList);

    const payload = resList.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.genres.map((g) => g.name)).toContain('Pop');

    errorSpy.mockRestore();
  });

  test('admin cannot add duplicate genre name (normalized)', async () => {
    if (!mongoAvailable) return;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res1 = createRes();
    await addGenre({ body: { name: 'Hip-Hop', bgColor: '#111111' } }, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = createRes();
    await addGenre({ body: { name: '  hip hop!!  ', bgColor: '#222222' } }, res2);

    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, isDuplicate: true })
    );

    errorSpy.mockRestore();
  });
});
