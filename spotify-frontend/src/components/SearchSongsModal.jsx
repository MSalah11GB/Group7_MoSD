import { useContext, useMemo, useState } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import { usePlaylist } from '../hooks/usePlaylist';
import { PlaylistContext } from '../context/PlaylistContext';

const RESULT_LIMIT = 20;

const SearchSongsModal = ({ playlistId, onClose, onSongAdded }) => {
  const { songsData } = useContext(PlayerContext);
  const { addSongToPlaylist } = useContext(PlaylistContext);
  const { data: currentPlaylist } = usePlaylist(playlistId);
  const { isSignedIn } = useUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Songs not already in the playlist, narrowed by the last submitted search (all of them when empty).
  const searchResults = useMemo(() => {
    const inPlaylist = new Set((currentPlaylist?.songs ?? []).map((song) => song._id));
    const available = songsData.filter((song) => !inPlaylist.has(song._id));

    const term = submittedTerm.trim().toLowerCase();
    if (!term) return available.slice(0, RESULT_LIMIT);

    return available.filter((song) =>
      [song.name, song.artistName || song.artist, song.album].some((field) => (field || '').toLowerCase().includes(term))
    );
  }, [songsData, currentPlaylist, submittedTerm]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setError('');
    setSubmittedTerm(searchTerm);
  };

  const handleAddSong = async (songId) => {
    if (!isSignedIn) {
      setError('You must be signed in to add songs to playlists');
      return;
    }

    // Since we're already in the context of a specific playlist (playlistId is passed as prop),
    // always add the song directly to the current playlist
    await addSongToCurrentPlaylist(songId);
  };

  const addSongToCurrentPlaylist = async (songId) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addSongToPlaylist(playlistId, songId);

      if (result.success) {
        setSuccess('Song added to playlist successfully');

        // Notify parent component
        if (onSongAdded) {
          onSongAdded(songId);
        }
      } else {
        setError(result.message || 'Failed to add song to playlist');
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };



  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add Songs to Playlist</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-center py-4">
            You need to be signed in to add songs to playlists.
          </p>

          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-white text-black font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Songs to Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900 text-white p-2 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 text-white p-2 rounded mb-4">
            {success}
          </div>
        )}

        {/* Show songs search and results */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-[#282828] p-2 rounded border border-gray-700 focus:border-white focus:outline-none"
            placeholder="Search for songs by name, artist, or album"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium"
            disabled={isLoading}
          >
            Search
          </button>
        </form>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              {searchTerm ? 'No songs found matching your search' : 'No songs available to add'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {searchResults.map((song) => (
                <div
                  key={song._id}
                  className="flex items-center gap-3 p-2 hover:bg-[#282828] rounded group"
                >
                  <img
                    src={song.image}
                    alt={song.name}
                    className="w-12 h-12 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{song.name}</p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artistName || song.artist} • {song.album}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddSong(song._id)}
                    className="px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-sm"
                    disabled={isLoading}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-2 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-transparent border border-gray-600 hover:border-white text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchSongsModal;
