import React, { useContext, useState, useEffect, useRef } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import PlaylistItem from './PlaylistItem';
import CreatePlaylist from './CreatePlaylist';
import { PlaylistContext } from '../context/PlaylistContext';
import Search from './Search';

const Sidebar = () => {

    const navigate = useNavigate();
    const { user } = useUser();
	const { playlistsData } = useContext(PlaylistContext);

	// Search state
	const [isSearchActive, setIsSearchActive] = useState(false);
    const searchRef = useRef(null);

	const [ showCreatePlaylist, setShowCreatePlaylist ] = useState(false);

    const userPlaylists = playlistsData.filter(playlist => {
        if (!user || !playlist.creator) return false;

        // Debug logging
        //console.log('Filtering playlist:', playlist.name);
        //console.log('Playlist creator:', playlist.creator);
        //console.log('Current user ID (Clerk):', user.id);

        // Check if the user is the creator, the creator field should have clerkId when populated from User model
        const isOwner = (playlist.creator.clerkId && playlist.creator.clerkId === user.id) ||
                       (playlist.creator._id && playlist.creator._id === user.id) ||
                       (playlist.creator === user.id); // In case creator is just the ID string

        //console.log('Is owner:', isOwner);
        return isOwner;
    });

    // Debug logging for playlist counts
    //console.log('Total playlists:', playlistsData.length);
    //console.log('User playlists:', userPlaylists.length);
    //console.log('User playlists:', userPlaylists);

	const handleCreatePlaylist = () => {
        if (!user) {
            // Could show a toast or redirect to login
            console.log('User must be logged in to create playlist');
            return;
        }
        setShowCreatePlaylist(true);
    };

	const handlePlaylistCreated = (newPlaylist) => {
        setShowCreatePlaylist(false);
        // The PlayerContext will automatically refresh playlistsData
        console.log('Playlist created:', newPlaylist);
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchActive(false);
				setSearchTerm('');
				setSearchResults([]);
				setShowSearchResults(false);
            }
        };

		if (isSearchActive) document.addEventListener('mousedown', handleClickOutside);

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchActive])

  	return (
		<div className='w-[25%] h-full p-2 flex-col gap-2 text-white hidden lg:flex'>
			<div className='bg-[#121212] h-[15%] rounded flex flex-col justify-around'>
				<div onClick={()=>navigate('/')} className='flex items-center gap-3 pl-8 cursor-pointer'>
					<img className='w-6' src={assets.home_icon} alt="" />
					<p className='font-bold'>Home</p>
				</div>

				{!isSearchActive && (
				<div onClick={() => setIsSearchActive(true)} className='flex items-center gap-3 pl-8 cursor-pointer hover:text-gray-300'>
					<img className='w-6' src={assets.search_icon} alt="" />
					<p className='font-bold'>Search</p>
				</div>
				)}
				
				{isSearchActive && (
                <Search onClose={() => setIsSearchActive(false)} />
                )}

			</div>

			<div className='bg-[#121212] h-[85%] rounded'>
				<div className='p-4 flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<img className='w-8' src={assets.stack_icon} alt="" />
					<p>Your Library</p>
				</div>
				<div className='flex items-center gap-3'>
					<img className='w-5' src={assets.arrow_icon} alt="" />
					<img className='w-5' src={assets.plus_icon} alt="" />
				</div>
				</div>

				{/* Show "Create your first playlist" only when user has no playlists */}
				{user && userPlaylists.length === 0 && (
				<div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
					<h1>Create your first playlist</h1>
					<p className='font-light'>It's easy, we will help you</p>
					<button
					onClick={handleCreatePlaylist}
					className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4 hover:scale-105 transition-transform'
					>
					Create Playlist
					</button>
				</div>
				)}

				{/* Display existing user playlists */}
				{user && userPlaylists.length > 0 && (
				<div className='mt-4 px-2'>
					<h3 className='text-sm font-semibold text-gray-400 mb-2 px-2'>Recently Created</h3>
					<div className='space-y-1'>
					{userPlaylists.slice(0, 5).map((playlist) => (
						<PlaylistItem key={playlist._id} playlist={playlist} />
					))}
					</div>
				</div>
				)}

				<div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
					<h1>Let's find some podcasts to follow</h1>
					<p className='font-light'>We'll keep you update on new episodes</p>
					<button className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4 hover:scale-105 transition-transform'>
						Browse podcasts
					</button>
				</div>
			</div>

			{/* Create Playlist Modal */}
			{showCreatePlaylist && (
				<CreatePlaylist
					onClose={() => setShowCreatePlaylist(false)}
					onPlaylistCreated={handlePlaylistCreated}
				/>
			)}
		</div>
	)
}

export default Sidebar