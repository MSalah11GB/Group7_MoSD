import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { PlayerContext } from '../context/PlayerContext';

const MAX_RESULTS = 8;

const matches = (term, ...fields) => fields.some((field) => field?.toLowerCase().includes(term));

const Search = ({ onClose }) => {
    const navigate = useNavigate();
    const { songsData, albumsData, playWithId } = useContext(PlayerContext);

    const [searchTerm, setSearchTerm] = useState('');
    const searchRef = useRef(null);

    // The whole library is already in memory, so results update as you type.
    const searchResults = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return [];

        const albums = albumsData
            .filter((album) => matches(term, album.name, album.desc))
            .map((album) => ({ _id: album._id, title: album.name, artist: '', type: 'album', image: album.image }));

        const songs = songsData
            .filter((song) => matches(term, song.name, song.artistName, song.album))
            .map((song) => ({ _id: song._id, title: song.name, artist: song.artistName, type: 'song', image: song.image }));

        return [...albums, ...songs].slice(0, MAX_RESULTS);
    }, [searchTerm, songsData, albumsData]);

    const showSearchResults = searchTerm.trim() !== '';

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
                <input type="text" autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search songs, artists, albums...'
                    className='w-full px-3 py-2 pl-10 bg-[#2a2a2a] text-white rounded-full'
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <img src={assets.search_icon} alt="Search" className="w-4 h-4 opacity-70" />
                </div>
            </div>

            {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="py-2">
                            {searchResults.map(item => (
                                <div
                                    key={`${item.type}-${item._id}`}
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
                        <div className="py-4 text-center text-gray-400 text-sm">No results found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;
