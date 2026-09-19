import { useContext } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import QueueSidebar from './components/QueueSidebar'
import StatusMessage from './components/StatusMessage'
import { PlayerContext } from './context/PlayerContext'

const App = () => {
    const { showQueue, libraryStatus } = useContext(PlayerContext);

    if (libraryStatus.isLoading) {
        return (
            <div className='h-screen bg-black'>
                <StatusMessage title='Loading music...' />
            </div>
        );
    }

    if (libraryStatus.isError) {
        return (
            <div className='h-screen bg-black'>
                <StatusMessage
                    title="Couldn't load the music library"
                    action={{ label: 'Try again', onClick: () => libraryStatus.refetch() }}
                >
                    Check your connection and that the server is running.
                </StatusMessage>
            </div>
        );
    }

    return (
        <div className='h-screen bg-black'>
            <div className="h-[90%] flex">
                <Sidebar />
                <Display />
                {showQueue && <QueueSidebar />}
            </div>
            <Player />
        </div>
    )
}

export default App
