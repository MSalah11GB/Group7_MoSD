import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from './Navbar'
import SongTable from './SongTable'
import StatusMessage from './StatusMessage'
import { assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'
import { formatTotalDuration, songsForAlbum } from '../lib/catalog'

const pluralize = (count, word) => `${count} ${word}${count !== 1 ? 's' : ''}`

const DisplayAlbum = () => {
    const { id } = useParams()
    const { playWithId, albumsData, songsData } = useContext(PlayerContext)

    const album = albumsData.find((item) => item._id === id)
    const albumSongs = useMemo(() => (album ? songsForAlbum(songsData, album) : []), [songsData, album])

    if (!album) return <StatusMessage title='Album not found'>It may have been removed.</StatusMessage>

    return (
        <>
        <Navbar />

        <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
            <img className='w-48 rounded' src={album.image} alt="" />

            <div className='flex flex-col'>
                <p>PlayList</p>
                <h2 className='text-5xl font-bold mb-4 md:text-7xl'>
                    {album.name}
                </h2>
            <h4>{album.desc}</h4>

            <p className='mt-1'>
                <img className='inline-block w-5' src={assets.spotify_logo} alt="" />
                <b> Spotify</b>
                • 1,323,154 likes •{' '}
                <b><b>{pluralize(albumSongs.length, 'song')}, </b></b>
                {formatTotalDuration(albumSongs)}
            </p>
            </div>
        </div>

        <SongTable
            songs={albumSongs}
            albumLabel={() => album.name}
            onPlay={playWithId}
            compact
            headerClassName='mt-10 mb-4'
        />
        </>
    )
}

export default DisplayAlbum
