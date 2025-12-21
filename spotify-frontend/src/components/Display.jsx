import DisplayAlbum from './DisplayAlbum'
import DisplayArtist from './DisplayArtist'
import DisplayGenre from './DisplayGenre'
import DisplayHome from './DisplayHome'
import DisplayPlaylist from './DisplayPlaylist'
import {Routes, Route, useLocation} from 'react-router-dom'
import React, {useContext, useRef} from 'react'
import { useEffect } from 'react'
import { PlayerContext } from '../context/PlayerContext'

const Display = () => {

    const {albumsData} = useContext(PlayerContext);
    const displayRef = useRef();
    const location = useLocation();
    const isAlbum = location.pathname.includes("album");
    const isArtist = location.pathname.includes("artist");
    const isPlaylist = location.pathname.includes("playlist");
    const isGenre = location.pathname.includes("genre");
    const isHome = location.pathname === '/';
    const albumId = isAlbum ? location.pathname.split('/').pop() : "";
    const artistId = isArtist ? location.pathname.split('/').pop() : "";
    const albumBgColor = isAlbum && albumsData.length > 0 ? albumsData.find((x) => (x._id == albumId))?.bgColor : "#121212";
    const artistBgColor = isArtist && artistsData.length > 0 ? artistsData.find((x) => (x._id == artistId))?.bgColor : "#4c1d95";
    useEffect(()=>{
        if (isAlbum) {
            displayRef.current.style.background = `linear-gradient(${albumBgColor}, #121212)`;
        } else if (isArtist) {
            displayRef.current.style.background = `linear-gradient(${artistBgColor}, #121212)`;
        } else if (isPlaylist) {
            displayRef.current.style.background = `linear-gradient(#1e3a8a, #121212)`;
        } else if (isGenre) {
            displayRef.current.style.background = `linear-gradient(#4c1d95, #121212)`;
        } else {
            displayRef.current.style.background = `#121212`;
        }
    }, [isAlbum, isArtist, isPlaylist, isGenre, albumBgColor, artistBgColor])

    return (
        <div ref={displayRef} className="w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white lg:w-[75%] lg:ml-0 overflow-y-auto ">
            {albumsData.length > 0 ?
                <Routes>
                    <Route path="/" element={<DisplayHome />} />
                    <Route path="/album/:id" element={<DisplayAlbum album={albumsData.find((album) => (album._id == albumId))} />} />
                    <Route path='/artist/:id' element={<DisplayArtist />}/>
                    <Route path='/genre/:genreId' element={<DisplayGenre />}/>
                    <Route path='/playlist/:id' element={<DisplayPlaylist />}/>
                </Routes>
            : null}
        </div>
    )
}

export default Display