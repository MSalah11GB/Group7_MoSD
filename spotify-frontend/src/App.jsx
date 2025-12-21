import { useContext, useState } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import QueueSidebar from './components/QueueSidebar'
import { PlayerContext } from './context/PlayerContext'

const App = () => {
    const {audioRef, track, songsData, showQueue} = useContext(PlayerContext);

    return (
        <div className='h-screen bg-black'>
            {songsData.length !== 0 ? <>
                <div className="h-[90%] flex">
                    <Sidebar />
                    <Display />
                    {showQueue && <QueueSidebar />}
                </div>
                <Player />
            </>
            : null}
        <audio ref={audioRef} src={track ? track.file : ""} preload='none'></audio>
        </div>
    )
}

export default App
