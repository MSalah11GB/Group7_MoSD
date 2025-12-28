import React, { useContext, useMemo, useState } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
const DisplayHome = () => {

    const {songsData, albumsData} = useContext(PlayerContext);
    const [selectedGenreId, setSelectedGenreId] = useState(null);

    const filteredSongs = useMemo(() => {
        if (!selectedGenreId) return songsData;
        return songsData.filter((song) => {
            const genres = song?.genres;
            if (!Array.isArray(genres)) return false;
            return genres.some((g) => {
                if (!g) return false;
                if (typeof g === 'string') return g === selectedGenreId;
                if (typeof g === 'object') {
                    if (g._id) return g._id === selectedGenreId;
                    if (typeof g.toString === 'function') return g.toString() === selectedGenreId.toString();
                }
                return false;
            });
        });
    }, [songsData, selectedGenreId]);

    return (
        <>
            <Navbar selectedGenreId={selectedGenreId} onSelectGenre={setSelectedGenreId} />
            <div className='mb-4'>
                <h1 className='my-5 font-bold text-2xl'>Featured Charts</h1>
                <div className='flex overflow-auto'>
                    {albumsData.map((item, index)=>(<AlbumItem key={index} image={item.image} name={item.name} desc={item.desc} id={item._id}/>))}
                </div>
            </div>
            <div className='mb-4'>
                <h1 className='my-5 font-bold text-2xl'>Today's biggest hits</h1>
                <div className='flex overflow-auto'>
                    {filteredSongs.map((item, index)=>(<SongItem key={index} image={item.image} name={item.name} desc={item.artistName} id={item._id}/>))}
                </div>
            </div>
        </>
  )
}

export default DisplayHome