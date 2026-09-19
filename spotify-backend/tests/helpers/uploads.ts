import { UPLOAD_KINDS, type UploadKind } from '../../src/services/mediaService.js';

/** The public id a browser would report after a successful direct upload of the given kind. */
export const uploaded = (kind: UploadKind, name: string) => `${UPLOAD_KINDS[kind].folder}/${name}`;

/** The delivery URL the mocked Cloudinary returns for such an upload. */
export const uploadedUrl = (kind: UploadKind, name: string) =>
  `https://res.cloudinary.com/testcloud/${UPLOAD_KINDS[kind].resourceType}/upload/v1/${uploaded(kind, name)}`;
