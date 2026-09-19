import { useContext, useMemo, useState } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import { songsForGenre } from '../lib/catalog'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import StatusMessage from './StatusMessage'

const DisplayHome = () => {
    const { songsData, albumsData } = useContext(PlayerContext);
    const [selectedGenreId, setSelectedGenreId] = useState(null);

    const filteredSongs = useMemo(
        () => (selectedGenreId ? songsForGenre(songsData, selectedGenreId) : songsData),
        [songsData, selectedGenreId]
    );

    return (
        <>
            <Navbar selectedGenreId={selectedGenreId} onSelectGenre={setSelectedGenreId} />
            {songsData.length === 0 && albumsData.length === 0 && (
                <StatusMessage title='No music yet'>Songs and albums added in the admin panel will show up here.</StatusMessage>
            )}
            {albumsData.length > 0 && (
                <div className='mb-4'>
                    <h1 className='my-5 font-bold text-2xl'>Featured Charts</h1>
                    <div className='flex overflow-auto'>
                        {albumsData.map((item) => (<AlbumItem key={item._id} image={item.image} name={item.name} desc={item.desc} id={item._id}/>))}
                    </div>
                </div>
            )}
            {songsData.length > 0 && (
                <div className='mb-4'>
                    <h1 className='my-5 font-bold text-2xl'>Today's biggest hits</h1>
                    {filteredSongs.length === 0 ? (
                        <p className='text-gray-400'>No songs in this genre yet.</p>
                    ) : (
                        <div className='flex overflow-auto'>
                            {filteredSongs.map((item) => (<SongItem key={item._id} image={item.image} name={item.name} artist={item.artistName} id={item._id}/>))}
                        </div>
                    )}
                </div>
            )}
        </>
  )
}

export default DisplayHome
