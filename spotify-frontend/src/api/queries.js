import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { fetchAndParseLRC } from '../utils/lrcParser';

const EMPTY = Object.freeze([]);
const FIVE_MINUTES = 5 * 60 * 1000;

export const queryKeys = {
    songs: ['songs'],
    albums: ['albums'],
    artists: ['artists'],
    genres: ['genres'],
    playlists: (userId) => ['playlists', userId ?? 'anonymous'],
    playlist: (id, userId) => ['playlist', id, userId ?? 'anonymous'],
    lyrics: (url) => ['lyrics', url],
};

export const apiGet = async (path, params) => {
    const { data } = await axios.get(`${API_BASE_URL}${path}`, { params });
    if (data && data.success === false) throw new Error(data.message || 'Request failed');
    return data;
};

const catalogQuery = (key, path, field) => ({
    queryKey: key,
    queryFn: async () => (await apiGet(path))[field] ?? EMPTY,
    staleTime: FIVE_MINUTES,
});

export const useSongsQuery = () => useQuery(catalogQuery(queryKeys.songs, '/api/song/list', 'songs'));
export const useAlbumsQuery = () => useQuery(catalogQuery(queryKeys.albums, '/api/album/list', 'albums'));
export const useArtistsQuery = () => useQuery(catalogQuery(queryKeys.artists, '/api/artist/list', 'artists'));
export const useGenresQuery = () => useQuery(catalogQuery(queryKeys.genres, '/api/genre/list', 'genres'));

/** Public playlists plus the signed-in user's own private ones; refetches when the user changes. */
export const playlistsQuery = (userId) => ({
    queryKey: queryKeys.playlists(userId),
    queryFn: async () => (await apiGet('/api/playlist/list')).playlists ?? EMPTY,
});

export const usePlaylistsQuery = (userId) => useQuery(playlistsQuery(userId));

export const playlistQuery = (id, userId) => ({
    queryKey: queryKeys.playlist(id, userId),
    queryFn: async () => (await apiGet('/api/playlist/get', { id })).playlist,
});

export const useLyricsQuery = (lrcUrl) =>
    useQuery({
        queryKey: queryKeys.lyrics(lrcUrl),
        queryFn: () => fetchAndParseLRC(lrcUrl),
        enabled: Boolean(lrcUrl),
        staleTime: Infinity,
    });

export { EMPTY };

/** The four catalog lists the whole app browses, plus one combined loading/error status. */
export const useLibrary = () => {
    const songs = useSongsQuery();
    const albums = useAlbumsQuery();
    const artists = useArtistsQuery();
    const genres = useGenresQuery();
    const queries = [songs, albums, artists, genres];

    return {
        songsData: songs.data ?? EMPTY,
        albumsData: albums.data ?? EMPTY,
        artistsData: artists.data ?? EMPTY,
        genresData: genres.data ?? EMPTY,
        libraryStatus: {
            isLoading: queries.some((q) => q.isPending),
            isError: songs.isError || albums.isError,
            error: songs.error ?? albums.error ?? null,
            refetch: () => Promise.all(queries.map((q) => q.refetch())),
        },
    };
};
