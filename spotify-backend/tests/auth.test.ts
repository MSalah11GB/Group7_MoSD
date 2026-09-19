import { describe, expect, it } from 'vitest';
import { api } from './helpers/api.js';

type Method = 'get' | 'post';

const adminRoutes: [Method, string][] = [
  ['post', '/api/song/add'],
  ['post', '/api/song/update'],
  ['post', '/api/song/remove'],
  ['post', '/api/song/spotify-metadata'],
  ['post', '/api/uploads/sign'],
  ['post', '/api/album/add'],
  ['post', '/api/album/update'],
  ['post', '/api/album/remove'],
  ['post', '/api/artist/add'],
  ['post', '/api/artist/update'],
  ['post', '/api/artist/remove'],
  ['post', '/api/genre/add'],
  ['post', '/api/genre/update'],
  ['post', '/api/genre/remove'],
  ['get', '/api/db/info'],
  ['get', '/api/db/collections'],
];

const signedInRoutes: [Method, string][] = [
  ['post', '/api/playlist/create'],
  ['post', '/api/playlist/update'],
  ['post', '/api/playlist/delete'],
  ['post', '/api/playlist/add-song'],
  ['post', '/api/playlist/remove-song'],
  ['post', '/api/playlist/reorder-songs'],
  ['post', '/api/auth/sync'],
];

describe('anonymous requests', () => {
  it.each([...adminRoutes, ...signedInRoutes])('%s %s -> 401', async (method, url) => {
    const res = await api[method](url);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });
});

describe('signed-in non-admin requests', () => {
  it.each(adminRoutes)('%s %s -> 403', async (method, url) => {
    const res = await api[method](url, 'user_regular');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it('cannot escalate by putting a role in the request body', async () => {
    const res = await api.post('/api/genre/add', 'user_regular').send({ name: 'Rock', bgColor: '#000', role: 'admin' });
    expect(res.status).toBe(403);
  });
});

describe('admin requests', () => {
  it.each([
    ['admin role in Clerk publicMetadata', 'admin_1'],
    ['ADMIN_USER_IDS allowlist', 'env_admin'],
  ])('pass authorization via %s and reach validation', async (_label, user) => {
    const res = await api.post('/api/genre/add', user).send({});
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Genre name is required');
  });
});

describe('/api/auth/me', () => {
  it('requires a session', async () => {
    expect((await api.get('/api/auth/me')).status).toBe(401);
  });

  it('reports the admin flag for the signed-in user', async () => {
    expect((await api.get('/api/auth/me', 'user_regular')).body).toMatchObject({ userId: 'user_regular', isAdmin: false });
    expect((await api.get('/api/auth/me', 'admin_1')).body).toMatchObject({ userId: 'admin_1', isAdmin: true });
    expect((await api.get('/api/auth/me', 'env_admin')).body.isAdmin).toBe(true);
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api.get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found' });
  });

  it('returns 400 for malformed JSON instead of a stack trace', async () => {
    const res = await api
      .post('/api/genre/update', 'env_admin')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });

  it('rejects ids that are not ObjectIds with 422', async () => {
    const res = await api.post('/api/genre/remove', 'env_admin').send({ id: 'not-an-id' });
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Invalid id');
  });
});

describe('cors', () => {
  it('allows configured origins only', async () => {
    const allowed = await api.get('/').set('Origin', 'http://localhost:5174');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5174');

    const denied = await api.get('/').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
