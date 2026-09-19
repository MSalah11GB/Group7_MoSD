import fs from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../env.js';
import { HttpError } from '../lib/HttpError.js';
import { logger } from '../lib/logger.js';

export type LocalFile = { path: string };

/**
 * Admin uploads go straight from the browser to Cloudinary using a signature issued here,
 * so large audio files never pass through this server. Each kind is confined to its own folder.
 */
export const UPLOAD_KINDS = {
  image: { resourceType: 'image', folder: 'musicify/images' },
  audio: { resourceType: 'video', folder: 'musicify/audio' },
  lrc: { resourceType: 'raw', folder: 'musicify/lyrics' },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

export const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const signUpload = (kind: UploadKind) => {
  const { resourceType, folder } = UPLOAD_KINDS[kind];
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, env.CLOUDINARY_SECRET_KEY!);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_NAME}/${resourceType}/upload`,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  };
};

/**
 * Verifies with Cloudinary that a client-reported upload really exists in the expected folder and
 * returns its trusted URL (and duration for audio). Nothing the browser says about the file is trusted.
 */
export const getUploaded = async (publicId: string, kind: UploadKind) => {
  const { resourceType, folder } = UPLOAD_KINDS[kind];
  if (!publicId.startsWith(`${folder}/`)) throw new HttpError(422, `Invalid ${kind} upload`);

  let resource: { secure_url: string; duration?: number };
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: resourceType });
  } catch {
    throw new HttpError(422, `The ${kind} upload was not found`);
  }

  return {
    url: resource.secure_url,
    duration: resource.duration ? formatDuration(resource.duration) : undefined,
  };
};

/** Splits one of our Cloudinary delivery URLs into what `destroy` needs; null for anything else. */
export const parseCloudinaryUrl = (url: string | undefined) => {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'res.cloudinary.com') return null;

  const match = parsed.pathname.match(/^\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match || match[1] !== env.CLOUDINARY_NAME) return null;

  const [, , resourceType, path] = match as unknown as [string, string, 'image' | 'video' | 'raw', string];
  // Raw assets keep their extension in the public id; images and video do not.
  const publicId = decodeURIComponent(resourceType === 'raw' ? path : path.replace(/\.[^./]+$/, ''));
  return { resourceType, publicId };
};

/** Best-effort removal of assets we own; failures are logged, never thrown. */
export const deleteAssets = async (urls: (string | undefined)[]) => {
  await Promise.all(
    urls.map(async (url) => {
      const asset = parseCloudinaryUrl(url);
      if (!asset) return;
      try {
        await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
      } catch (err) {
        logger.warn({ err, url }, 'Failed to delete Cloudinary asset');
      }
    })
  );
};

export const removeLocalFile = (file: LocalFile) => fs.unlink(file.path).catch(() => {});

/** Playlist covers are small user uploads and still pass through the server. */
export const uploadImageFile = async (imageFile: LocalFile): Promise<string> => {
  try {
    const upload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: 'image',
      folder: 'musicify/playlists',
    });
    return upload.secure_url;
  } finally {
    await removeLocalFile(imageFile);
  }
};
