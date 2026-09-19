import type { Query } from 'mongoose';
import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type Page = { page: number; limit: number };

const DEFAULT_LIMIT = 20;

/** Pagination is opt-in: without `page` or `limit` a list endpoint returns everything. */
export const toPage = (query: { page?: number; limit?: number }): Page | undefined =>
  query.page || query.limit
    ? { page: query.page ?? 1, limit: query.limit ?? DEFAULT_LIMIT }
    : undefined;

export const applyPage = <Q extends Query<any, any>>(query: Q, page: Page | undefined): Q =>
  page ? (query.skip((page.page - 1) * page.limit).limit(page.limit) as Q) : query;

export const pageMeta = (page: Page | undefined, total: number) =>
  page
    ? { pagination: { ...page, total, totalPages: Math.max(1, Math.ceil(total / page.limit)) } }
    : {};
