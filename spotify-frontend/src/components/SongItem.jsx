import React, { useContext } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/assets'

const SongItem = ({name, image, artist, id}) => { // Changed from desc to artist

    const { playWithId, addToQueue } = useContext(PlayerContext);

    const handleAddToQueue = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToQueue(id);
    };

    return (
        <div onClick={()=>playWithId(id)} className='group min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]'>
            <div className='w-full h-[180px] overflow-hidden relative'>
                <img className='rounded w-full h-full object-cover' src={image} alt="" />
                <button
                    type='button'
                    onClick={handleAddToQueue}
                    className='absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity'
                    aria-label='Add to queue'
                    title='Add to queue'
                >
                    <img className='w-4 h-4' src={assets.queue_icon} alt='' />
                </button>
            </div>
            <p className='font-bold mt-2 mb-1 truncate'>{name}</p>
            <p className='text-slate-200 text-sm truncate'>{artist}</p> {/* Changed from desc to artist */}
        </div>
    )
}

export default SongItem