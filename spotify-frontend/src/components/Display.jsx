import { useContext } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import DisplayAlbum from './DisplayAlbum'
import DisplayArtist from './DisplayArtist'
import DisplayGenre from './DisplayGenre'
import DisplayHome from './DisplayHome'
import DisplayPlaylist from './DisplayPlaylist'
import Lyrics from './Lyrics'
import StatusMessage from './StatusMessage'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/assets'

const BASE = '#121212'

// The page header gradient follows what is being browsed.
const pageBackground = (pathname, albumsData, artistsData) => {
    const id = pathname.split('/').pop()
    if (pathname.includes('album')) {
        return `linear-gradient(${albumsData.find((album) => album._id === id)?.bgColor ?? BASE}, ${BASE})`
    }
    if (pathname.includes('artist')) {
        return `linear-gradient(${artistsData.find((artist) => artist._id === id)?.bgColor ?? '#4c1d95'}, ${BASE})`
    }
    if (pathname.includes('playlist')) return `linear-gradient(#1e3a8a, ${BASE})`
    if (pathname.includes('genre')) return `linear-gradient(#4c1d95, ${BASE})`
    return BASE
}

const Display = () => {
    const { albumsData, artistsData, showLyrics, setShowLyrics } = useContext(PlayerContext)
    const { pathname } = useLocation()

    return (
        <main
            style={{ background: pageBackground(pathname, albumsData, artistsData) }}
            className='w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0'
        >
            {showLyrics ? (
                <div className="h-full relative">
                    <div className="flex items-center py-4 sticky top-0 z-10 bg-[#121212] shadow-md">
                        <img
                            src={assets.arrow_left}
                            alt="Back"
                            className="w-6 h-6 cursor-pointer hover:opacity-80 mr-2"
                            onClick={() => setShowLyrics(false)}
                            title="Back to Browse"
                        />
                        <h2 className="text-xl font-bold">Lyrics</h2>
                    </div>
                    <div className="h-[calc(100%-3.5rem)]">
                        <Lyrics />
                    </div>
                </div>
            ) : (
                <div>
                    <Routes>
                        <Route path="/" element={<DisplayHome />} />
                        <Route path="/album/:id" element={<DisplayAlbum />} />
                        <Route path='/artist/:id' element={<DisplayArtist />}/>
                        <Route path='/genre/:genreId' element={<DisplayGenre />}/>
                        <Route path='/playlist/:id' element={<DisplayPlaylist />}/>
                        <Route path='*' element={<StatusMessage title='Page not found' />} />
                    </Routes>
                </div>
            )}
        </main>
    )
}

export default Display
