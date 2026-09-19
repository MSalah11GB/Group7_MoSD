import type { RequestHandler } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { env } from '../env.js';
import { HttpError } from '../lib/HttpError.js';

const ADMIN_CACHE_TTL_MS = 60_000;
const adminCache = new Map<string, { value: boolean; expires: number }>();

export const isAdmin = async (userId: string): Promise<boolean> => {
  if (env.ADMIN_USER_IDS.includes(userId)) return true;

  const cached = adminCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.value;

  const user = await clerkClient.users.getUser(userId);
  const value = user.publicMetadata?.role === 'admin';
  adminCache.set(userId, { value, expires: Date.now() + ADMIN_CACHE_TTL_MS });
  return value;
};

export const clearAdminCache = () => adminCache.clear();

/** Attaches req.userId when a valid Clerk session is present; never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  req.userId = getAuth(req).userId ?? undefined;
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, 'Unauthorized - you must be logged in');
  req.userId = userId;
  next();
};

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, 'Unauthorized - you must be logged in');
  if (!(await isAdmin(userId))) throw new HttpError(403, 'Forbidden - admin access required');
  req.userId = userId;
  next();
};

export const currentUserId = (req: Express.Request): string => {
  if (!req.userId) throw new HttpError(401, 'Unauthorized - you must be logged in');
  return req.userId;
};
