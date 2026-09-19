import type { NextFunction, Request, Response } from 'express';
import { vi } from 'vitest';

// Tests sign in by sending an `x-test-user` header. Ids starting with "admin_" are given the
// admin role in their (fake) Clerk profile; "env_admin" is admin through ADMIN_USER_IDS.
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: (req: Request) => ({ userId: (req.headers['x-test-user'] as string | undefined) ?? null }),
  clerkClient: {
    users: {
      getUser: async (id: string) => ({
        id,
        firstName: 'Test',
        lastName: id,
        username: null,
        imageUrl: `https://img.test/${id}.png`,
        publicMetadata: id.startsWith('admin_') ? { role: 'admin' } : {},
      }),
    },
  },
}));

// A public id containing "missing" simulates an upload that never reached Cloudinary.
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    utils: { api_sign_request: vi.fn(() => 'test-signature') },
    api: {
      resource: vi.fn(async (publicId: string, options: { resource_type: string }) => {
        if (publicId.includes('missing')) throw new Error('Resource not found');
        return {
          secure_url: `https://res.cloudinary.com/testcloud/${options.resource_type}/upload/v1/${publicId}`,
          duration: options.resource_type === 'video' ? 125 : undefined,
        };
      }),
    },
    uploader: {
      upload: vi.fn(async () => ({ secure_url: 'https://cdn.test/asset' })),
      destroy: vi.fn(async () => ({ result: 'ok' })),
    },
  },
}));
