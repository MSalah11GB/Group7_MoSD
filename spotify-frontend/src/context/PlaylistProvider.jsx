import { useContext } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { EMPTY, playlistQuery, queryKeys, usePlaylistsQuery } from '../api/queries';
import { API_BASE_URL } from '../config/api';
import { PlayerContext } from './PlayerContext';
import { PlaylistContext } from './PlaylistContext';

const post = (path, body) => axios.post(`${API_BASE_URL}${path}`, body);

const messageOf = (error, fallback) => error.response?.data?.message || fallback;

const PlaylistProvider = ({ children }) => {
    const { user } = useUser();
    const userId = user?.id;
    const queryClient = useQueryClient();
    const { playTrack } = useContext(PlayerContext);

    const { data: playlistsData = EMPTY } = usePlaylistsQuery(userId);

    const refreshPlaylists = () => queryClient.invalidateQueries({ queryKey: ['playlists'] });
    const refreshPlaylist = (playlistId) => queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });

    const createPlaylist = async (playlistData, imageFile) => {
        try {
            const formData = new FormData();
            formData.append('name', playlistData.name);
            formData.append('description', playlistData.description || '');
            formData.append('isPublic', playlistData.isPublic);
            if (imageFile) formData.append('image', imageFile);

            const response = await post('/api/playlist/create', formData);
            await refreshPlaylists();
            return { success: true, playlist: response.data.playlist };
        } catch (error) {
            return { success: false, message: messageOf(error, 'Failed to create playlist') };
        }
    };

    const addSongToPlaylist = async (playlistId, songId) => {
        try {
            await post('/api/playlist/add-song', { playlistId, songId });
            await Promise.all([refreshPlaylist(playlistId), refreshPlaylists()]);
            return { success: true };
        } catch (error) {
            return { success: false, message: messageOf(error, 'Failed to add song to playlist') };
        }
    };

    // Optimistic: the song disappears immediately and comes back if the server refuses.
    const removeSongFromPlaylist = (playlistId, songId) => {
        queryClient.setQueriesData({ queryKey: ['playlist', playlistId] }, (playlist) =>
            playlist && { ...playlist, songs: playlist.songs.filter((song) => song._id !== songId) }
        );

        post('/api/playlist/remove-song', { playlistId, songId })
            .then(refreshPlaylists)
            .catch((error) => {
                console.error('Removing song failed, restoring playlist:', error);
                refreshPlaylist(playlistId);
            });

        return Promise.resolve({ success: true });
    };

    // Optimistic: the playlist disappears from the list immediately and returns if the server refuses.
    const deletePlaylist = (playlistId) => {
        queryClient.setQueryData(queryKeys.playlists(userId), (current = EMPTY) =>
            current.filter((playlist) => playlist._id !== playlistId)
        );
        queryClient.removeQueries({ queryKey: ['playlist', playlistId] });

        post('/api/playlist/delete', { id: playlistId }).catch((error) => {
            console.error('Deleting playlist failed, restoring list:', error);
            refreshPlaylists();
        });

        return Promise.resolve({ success: true, message: 'Playlist deleted successfully' });
    };

    const playPlaylist = async (playlistId) => {
        try {
            const playlist = await queryClient.fetchQuery({ ...playlistQuery(playlistId, userId), staleTime: 0 });
            const firstSong = playlist.songs?.[0];
            if (!firstSong) return { success: false, message: 'Playlist is empty' };

            playTrack(firstSong);
            return { success: true };
        } catch (error) {
            return { success: false, message: messageOf(error, 'Failed to play playlist') };
        }
    };

    const value = {
        playlistsData,
        createPlaylist,
        deletePlaylist,
        playPlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
    };

    return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
};

export default PlaylistProvider;
