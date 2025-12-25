import { createContext, useContext, useState, useEffect } from "react";
import axios from 'axios';
import { PlayerContext } from "./PlayerContext";

export const PlaylistContext = createContext();

const url = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const PlaylistContextProvider = (props) => {

    const [currentPlaylist, setCurrentPlaylist] = useState(null);
    const [playlistsData, setPlaylistsData] = useState([]);
    const { setTrack, setPlayOnLoad } = useContext(PlayerContext);
    
    // Playlist functions
    const createPlaylist = async (playlistData, imageFile) => {
        try {
            const formData = new FormData();
            formData.append('name', playlistData.name);
            formData.append('description', playlistData.description || '');
            formData.append('isPublic', playlistData.isPublic);
            formData.append('clerkId', playlistData.clerkId);

            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await axios.post(`${url}/api/playlist/create`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                console.log('Playlist created successfully, refreshing playlist data...');
                // Refresh playlists data
                const playlistsResponse = await axios.get(`${url}/api/playlist/list`);
                if (playlistsResponse.data.success) {
                    console.log('Refreshed playlists:', playlistsResponse.data.playlists);
                    setPlaylistsData(playlistsResponse.data.playlists);
                } else {
                    console.error('Failed to refresh playlists:', playlistsResponse.data.message);
                }
                return { success: true, playlist: response.data.playlist };
            } else {
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            return { success: false, message: error.response?.data?.message || 'Failed to create playlist' };
        }
    };

    const loadPlaylist = async (playlistId, clerkId = '') => {
        try {
            console.log(`[PlayerContext] Loading playlist ${playlistId}`);

            const response = await axios.get(`${url}/api/playlist/get`, {
                params: {
                    id: playlistId,
                    clerkId: clerkId
                }
            });

            if (response.data.success) {
                console.log(`[PlayerContext] Playlist loaded successfully`);
                setCurrentPlaylist(response.data.playlist);
                return { success: true, playlist: response.data.playlist };
            } else {
                console.error(`[PlayerContext] API returned error:`, response.data.message);
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('[PlayerContext] Error loading playlist:', error.message);

            if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network connection failed. Please check if the backend server is running.' };
            }

            return { success: false, message: `Network error: ${error.message}` };
        }
    };

    const addSongToPlaylist = async (playlistId, songId, clerkId = '') => {
        try {
            const response = await axios.post(`${url}/api/playlist/add-song`, {
                playlistId: playlistId,
                songId: songId,
                clerkId: clerkId
            });

            if (response.data.success) {
                // Refresh current playlist if it's the one being modified
                if (currentPlaylist && currentPlaylist._id === playlistId) {
                    await loadPlaylist(playlistId, clerkId);
                }

                // Refresh playlists data
                const playlistsResponse = await axios.get(`${url}/api/playlist/list`);
                if (playlistsResponse.data.success) {
                    setPlaylistsData(playlistsResponse.data.playlists);
                }

                return { success: true };
            } else {
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('Error adding song to playlist:', error);
            return { success: false, message: error.response?.data?.message || 'Failed to add song to playlist' };
        }
    };

    const removeSongFromPlaylist = (playlistId, songId, clerkId = '') => {
        // OPTIMISTIC UPDATE: Remove song from current playlist immediately
        let originalPlaylist = null;
        if (currentPlaylist && currentPlaylist._id === playlistId) {
            originalPlaylist = { ...currentPlaylist };
            const updatedSongs = currentPlaylist.songs.filter(song => song._id !== songId);
            setCurrentPlaylist({
                ...currentPlaylist,
                songs: updatedSongs,
                songCount: updatedSongs.length
            });
            console.log('Optimistically removed song from playlist UI');
        }

        // Send remove request to backend in background (fire-and-forget)
        axios.post(`${url}/api/playlist/remove-song`, {
            playlistId: playlistId,
            songId: songId,
            clerkId: clerkId
        }).then(response => {
            if (response.data.success) {
                console.log('Song removed successfully from backend');
                // Refresh playlists data to keep sidebar in sync
                axios.get(`${url}/api/playlist/list`).then(playlistsResponse => {
                    if (playlistsResponse.data.success) {
                        setPlaylistsData(playlistsResponse.data.playlists);
                    }
                });
            } else {
                // REVERT: Backend failed, restore the song in UI
                console.error('Backend remove failed, reverting UI:', response.data.message);
                if (originalPlaylist) {
                    setCurrentPlaylist(originalPlaylist);
                }
            }
        }).catch(error => {
            // REVERT: Network error, restore the song in UI
            console.error('Network error during song removal, reverting UI:', error);
            if (currentPlaylist && currentPlaylist._id === playlistId) {
                // Re-fetch to restore original state
                loadPlaylist(playlistId, clerkId);
            }
        });

        // Return immediately with success (optimistic)
        return Promise.resolve({ success: true });
    };

    const deletePlaylist = (playlistId, clerkId = '') => {
        // OPTIMISTIC UPDATE: Remove playlist from UI immediately
        const originalPlaylists = [...playlistsData];
        const updatedPlaylists = playlistsData.filter(playlist => playlist._id !== playlistId);
        setPlaylistsData(updatedPlaylists);

        console.log('Optimistically removed playlist from UI, sending delete request in background...');

        // Send delete request to backend in background (fire-and-forget)
        axios.post(`${url}/api/playlist/delete`, {
            id: playlistId,
            clerkId: clerkId
        }).then(response => {
            if (response.data.success) {
                console.log('Playlist deleted successfully on backend');
            } else {
                // REVERT: Backend failed, restore the playlist in UI
                console.error('Backend delete failed, reverting UI:', response.data.message);
                setPlaylistsData(originalPlaylists);
            }
        }).catch(error => {
            // REVERT: Network error, restore the playlist in UI
            console.error('Network error during delete, reverting UI:', error);
            // Restore original state by re-fetching (safest approach)
            axios.get(`${url}/api/playlist/list`).then(playlistsResponse => {
                if (playlistsResponse.data.success) {
                    setPlaylistsData(playlistsResponse.data.playlists);
                }
            }).catch(fetchError => {
                console.error('Failed to restore playlists after error:', fetchError);
            });
        });

        // Return immediately with success (optimistic)
        return Promise.resolve({ success: true, message: 'Playlist deleted successfully' });
    };

    const playPlaylist = async (playlistId, clerkId = '') => {
        try {
            // Load the playlist first
            const result = await loadPlaylist(playlistId, clerkId);
            if (result.success && result.playlist.songs && result.playlist.songs.length > 0) {
                // Play the first song in the playlist
                const firstSong = result.playlist.songs[0];
                setTrack(firstSong);
                setPlayOnLoad(true);
                return { success: true };
            } else {
                return { success: false, message: 'Playlist is empty or could not be loaded' };
            }
        } catch (error) {
            console.error('Error playing playlist:', error);
            return { success: false, message: 'Failed to play playlist' };
        }
    }

    // Fetch playlists data
    useEffect(() => {
        const getPlaylists = async () => {
            try {
                const response = await axios.get(`${url}/api/playlist/list`);
                if (response.data.success) {
                    //console.log('Initial playlists loaded:', response.data.playlists);
                    setPlaylistsData(response.data.playlists);
                }
            } catch (error) {
                console.error("Error fetching playlists:", error);
            }
        };
        getPlaylists();
    }, [url]);
    
    const contextValue = {
        playlistsData, setPlaylistsData,
        currentPlaylist, setCurrentPlaylist,
        createPlaylist, deletePlaylist,
        loadPlaylist, playPlaylist,
        addSongToPlaylist, removeSongFromPlaylist,
    };

    return (
        <PlaylistContext.Provider value={contextValue}>
            {props.children}
        </PlaylistContext.Provider>
    )
}

export default PlaylistContextProvider;