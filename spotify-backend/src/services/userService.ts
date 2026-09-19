import { clerkClient } from '@clerk/express';
import { User } from '../models/userModel.js';

/** Creates or refreshes the local user record from the authoritative Clerk profile. */
export const syncUser = async (clerkId: string) => {
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    clerkUser.username ||
    'User';

  return User.findOneAndUpdate(
    { clerkId },
    { $set: { fullName, imageURL: clerkUser.imageUrl } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

export const getOrCreateUser = async (clerkId: string) =>
  (await User.findOne({ clerkId })) ?? (await syncUser(clerkId));
