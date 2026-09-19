import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { playlistQuery } from '../api/queries';

/** One playlist by id. Shared through the query cache, so every component sees the same data. */
export const usePlaylist = (id) => {
    const { user } = useUser();
    return useQuery({ ...playlistQuery(id, user?.id), enabled: Boolean(id), retry: false });
};

export const playlistErrorMessage = (error) =>
    error ? error.response?.data?.message || error.message || 'Failed to load playlist' : '';
