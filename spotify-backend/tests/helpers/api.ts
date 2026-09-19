import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

export const api = {
  get: (url: string, user?: string) => withUser(request(app).get(url), user),
  post: (url: string, user?: string) => withUser(request(app).post(url), user),
};

const withUser = <T extends request.Test>(req: T, user?: string): T =>
  user ? (req.set('x-test-user', user) as T) : req;
