import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { url } from '../config/api';

const KINDS = {
    song: { path: '/api/song/list', field: 'songs' },
    album: { path: '/api/album/list', field: 'albums' },
    artist: { path: '/api/artist/list', field: 'artists' },
    genre: { path: '/api/genre/list', field: 'genres' },
};

const NONE = Object.freeze([]);

/**
 * A catalog list ('song' | 'album' | 'artist' | 'genre'), optionally filtered by a server-side search.
 * Mutations refresh every cached list of a kind with invalidateQueries({ queryKey: [kind] }).
 */
export const useCatalogList = (kind, search = '') => {
    const { path, field } = KINDS[kind];

    const query = useQuery({
        queryKey: [kind, 'list', search],
        queryFn: async () => {
            const { data } = await axios.get(`${url}${path}`, { params: search ? { search } : undefined });
            if (data.success === false) throw new Error(data.message || `Unable to load ${field}`);
            return data[field] ?? NONE;
        },
        placeholderData: keepPreviousData,
    });

    return { ...query, data: query.data ?? NONE };
};
