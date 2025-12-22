import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { assets } from '../assets/assets';
import { PlayerContext } from '../context/PlayerContext';

const Search = ({ onClose }) => {
    const navigate = useNavigate();
    const { songsData, playWithId } = useContext(PlayerContext);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [loading, setLoading] = useState(false);

    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    const performSearch = async (term) => {
        if (!term.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setLoading(true);
        setShowSearchResults(true);

        try {
            let results = [];

            // Album search
            const albumResponse = await axios.get(
                `http://localhost:4000/api/album/list?search=${encodeURIComponent(term)}`
            );

            if (albumResponse.data?.success) {
                results.push(
                    ...albumResponse.data.albums.map(album => ({
                        _id: album._id,
                        title: album.name,
                        artist: album.artist || '',
                        type: 'album',
                        image: album.image
                    }))
                );
            }

            // Local song search
            const filteredSongs = songsData.filter(song =>
                song.name?.toLowerCase().includes(term.toLowerCase()) ||
                song.artistName?.toLowerCase().includes(term.toLowerCase()) ||
                song.album?.toLowerCase().includes(term.toLowerCase())
            );

            results.push(
                ...filteredSongs.map(song => ({
                    _id: song._id,
                    title: song.name,
                    artist: song.artistName,
                    type: 'song',
                    image: song.image
                }))
            );

            setSearchResults(results.slice(0, 8));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleResultClick = (item) => {
        if (item.type === 'song') playWithId(item._id);
        if (item.type === 'album') navigate(`/album/${item._id}`);

        onClose();
    };

    // Click outside → close search
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={searchRef} className='relative px-4 mt-2'>
            <div className='relative'>
                <input type="text" autoFocus value={searchTerm} onChange={handleChange}
                    placeholder='Search songs, artists, albums...'
                    className='w-full px-3 py-2 pl-10 bg-[#2a2a2a] text-white rounded-full'
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <img src={assets.search_icon} alt="Search" className="w-4 h-4 opacity-70" />
                </div>
                {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="py-2">
                            {searchResults.map(item => (
                                <div
                                    key={item._id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#3a3a3a] cursor-pointer"
                                    onClick={() => handleResultClick(item)}
                                >
                                    <img src={item.image} alt={item.title} className="w-10 h-10 rounded object-cover"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {item.artist} {item.type === 'album' && '• Album'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-4 text-center text-gray-400 text-sm">
                            {loading ? 'Searching...' : 'No results found'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;