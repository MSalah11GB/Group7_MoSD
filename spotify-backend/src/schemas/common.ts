import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** Accepts real booleans (JSON bodies) and "true"/"false" strings (multipart/query). */
export const boolish = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

/** Multipart repeats a field to send lists: a single value arrives as a string, several as an array. */
const toList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform(toList);

export const objectIdList = stringList.pipe(z.array(objectId));

export const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{3,8}$/i, 'Background color must be a hex color like #1db954');

export const requiredText = (label: string, max = 200) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

export const searchQuery = z.object({ search: z.string().trim().max(100).optional() });

export const listQuery = searchQuery.extend(paginationQuery.shape);

/** A reference to an album: an id, or "none"/empty to mean no album. */
export const albumRef = z
  .union([objectId, z.literal('none'), z.literal('')])
  .transform((value) => (value === 'none' || value === '' ? null : value));

/** Cloudinary public id returned by a direct browser upload. */
export const publicId = z.string().trim().min(1).max(300);

export const idBody = z.object({ id: objectId });
