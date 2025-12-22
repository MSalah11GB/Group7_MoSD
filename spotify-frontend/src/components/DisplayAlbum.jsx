import Navbar from './Navbar'
import { useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'
import { useContext, useEffect, useState } from 'react'

const DisplayAlbum = () => {
    const { id } = useParams()
    const [albumData, setAlbumData] = useState(null)
    const { playWithId, albumsData, songsData } = useContext(PlayerContext)

    // Find album by id
    useEffect(() => {
        const album = albumsData.find(item => item._id === id)
        setAlbumData(album)
    }, [albumsData, id])

    if (!albumData) return null

    // Get songs for this album
    const albumSongs = songsData.filter(
        song => song.album === albumData.name
    )

    const songCount = albumSongs.length

    const pluralize = (count, word) => `${count} ${word}${count !== 1 ? 's' : ''}`

    // Convert mm:ss → seconds
    const durationToSeconds = (duration) => {
        const [minutes, seconds] = duration.split(':').map(Number)
        return minutes * 60 + seconds
    }

    // Calculate total duration
    const totalSeconds = albumSongs.reduce(
        (acc, song) => acc + durationToSeconds(song.duration),
        0
    )

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    const totalDuration =
        hours > 0
        ? `about ${hours} hr ${minutes} min`
        : `about ${minutes} min`

    return (
        <>
        <Navbar />

        <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
            <img className='w-48 rounded' src={albumData.image} alt="" />

            <div className='flex flex-col'>
                <p>PlayList</p>
                <h2 className='text-5xl font-bold mb-4 md:text-7xl'>
                    {albumData.name}
                </h2>
            <h4>{albumData.desc}</h4>

            <p className='mt-1'>
                <img className='inline-block w-5' src={assets.spotify_logo} alt="" />
                <b> Spotify</b>
                • 1,323,154 likes •{' '}
                <b><b>{pluralize(songCount, 'song')}, </b></b>
                {totalDuration}
            </p>
            </div>
        </div>

        <div className='grid grid-cols-3 sm:grid-cols-4 mt-10 mb-4 pl-2 text-[#a7a7a7]'>
            <p><b className='mr-4'>#</b>Title</p>
            <p>Album</p>
            <p className='hidden sm:block'>Date added</p>
            <img className='m-auto w-4' src={assets.clock_icon} alt="" />
        </div>

        <hr />

        {albumSongs.map((item, index) => (
            <div key={item._id} onClick={() => playWithId(item._id)}
                className='grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] cursor-pointer'
            >
                <p className='text-white'>
                    <b className='mr-4 text-[#a7a7a7]'>{index + 1}</b>
                    <img className='inline w-10 mr-5' src={item.image} alt="" />
                    {item.name}
                </p>

                <p className='text-[15px]'>{albumData.name}</p>
                <p className='text-[15px] hidden sm:block'>5 days ago</p>
                <p className='text-[15px] text-center'>{item.duration}</p>
            </div>
        ))}
        </>
    )
}

export default DisplayAlbum
