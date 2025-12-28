import React, { useContext, useMemo } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react"
import { PlayerContext } from '../context/PlayerContext'

const Navbar = ({ selectedGenreId = null, onSelectGenre }) => {
    const navigate = useNavigate()
    const { genresData = [] } = useContext(PlayerContext);

    const topGenres = useMemo(() => {
        if (!Array.isArray(genresData)) return [];
        return [...genresData]
            .filter(g => g && g._id && g.name)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 3);
    }, [genresData]);

    const pillBase = 'px-4 py-1 rounded-2xl cursor-pointer';
    const pillSelected = 'bg-white text-black';
    const pillUnselected = 'bg-black text-white';

    const handleSelectAll = () => {
        if (typeof onSelectGenre === 'function') onSelectGenre(null);
    };

    const handleSelectGenre = (genreId) => {
        if (typeof onSelectGenre === 'function') onSelectGenre(genreId);
    };

    return (
        <>
            <div className='w-full flex justify-between items-center font-semibold'>
                <div className='flex items-center gap-2'>
                    <img onClick={()=>navigate(-1)} className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_left} alt="arrow_left" />
                    <img onClick={()=>navigate(1)} className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_right} alt="arrow_right" />
                </div>
                <div className='flex items-center gap-4'>
                    <div className='flex items-center gap-4'>
                    <SignedOut>
                        <SignInButton>
                            <button className='bg-white text-black px-4 py-1 rounded-2xl cursor-pointer'>
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton 
                            signOutCallback={() => {
                                navigate('/');
                            }}
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8"
                                }
                            }}
                        />
                    </SignedIn>
                </div>
                </div>
            </div>
            <div className='flex items-center gap-2 mt-4'>
                <p
                    onClick={handleSelectAll}
                    className={`${pillBase} ${selectedGenreId ? pillUnselected : pillSelected}`}
                >
                    All
                </p>

                {topGenres.map((genre) => (
                    <p
                        key={genre._id}
                        onClick={() => handleSelectGenre(genre._id)}
                        className={`${pillBase} ${selectedGenreId === genre._id ? pillSelected : pillUnselected}`}
                    >
                        {genre.name}
                    </p>
                ))}
            </div>
        </>
    )
}

export default Navbar