import type { RequestHandler } from 'express';
import { currentUserId, isAdmin } from '../middleware/auth.js';
import { syncUser } from '../services/userService.js';

/** Mirrors the signed-in Clerk user into MongoDB using Clerk's own data, never the request body. */
export const syncCurrentUser: RequestHandler = async (req, res) => {
  await syncUser(currentUserId(req));
  res.json({ success: true });
};

/** Lets clients (the admin panel) find out whether the signed-in user may use admin routes. */
export const whoAmI: RequestHandler = async (req, res) => {
  const userId = currentUserId(req);
  res.json({ success: true, userId, isAdmin: await isAdmin(userId) });
};
