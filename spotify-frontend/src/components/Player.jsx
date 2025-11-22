// Musicify-frontend/src/components/Player.jsx
import React, { useContext } from 'react';
import { assets } from '../assets/assets'; 
import { PlayerContext } from '../context/PlayerContext';

const Player = () => {

    const { track, seekBar, seekBg, play, pause, playStatus, time, nextSong, previousSong,
        seekSong, toggleLoop, isLooping, isShuffle, toggleShuffle, volume, handleVolumeChange,
        isMuted, toggleMute } = useContext(PlayerContext)

    return track ? (
        <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
            <div className='hidden lg:flex items-center gap-4'>
                <img className='w-12' src={track.image} alt="song img" />
                <div>
                    <p>{track.name}</p>
                    <p>{track.artistName || track.artist}</p>
                </div>
            </div>
            <div className='flex flex-col items-center gap-1 m-auto'>
                <div className='flex gap-4'>
                    <img onClick = {toggleShuffle} className='w-4 cursor-pointer' src={assets.shuffle_icon} alt="Shuffle" />
                    <img onClick = {previousSong} className='w-4 cursor-pointer' src={assets.prev_icon} alt="Previous" />
                    {!playStatus ? (
                        <img onClick={play} className='w-4 cursor-pointer' src={assets.play_icon} alt="play_icon" />
                    ) : (
                        <img onClick={pause} className='w-4 cursor-pointer' src={assets.pause_icon} alt="pause_icon" />
                    )}
                    <img onClick = {nextSong} className='w-4 cursor-pointer' src={assets.next_icon} alt="Next" />
                    <img className='w-4 cursor-pointer' src={assets.loop_icon} alt="Loop" />
                </div>
                <div className='flex items-center gap-5'>
                    <p>{time.currentTime.minute}:{time.currentTime.second}</p>
                    <div ref = {seekBg} onClick = {seekSong} className='w-[50vw] md:w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer'>
                        <hr ref = {seekBar} className='h-1 border-none w-10 bg-green-800 rounded-full' />
                    </div>
                    <p>{time.totalTime.minute}:{time.totalTime.second}</p>
                </div>
            </div>

            <div className='hidden lg:flex items-center gap-3 opacity-75'>
                <img
                    className='w-4 cursor-pointer'
                    src={assets.plays_icon}
                    alt="Plays"
                />
                <img
                    className='w-4 cursor-pointer'
                    src={assets.mic_icon}
                    alt="Mic"
                />
                <img
                    className='w-4 cursor-pointer'
                    src={assets.queue_icon}
                    alt="Queue"
                />
                <img
                    className='w-4 cursor-pointer'
                    src={assets.speaker_icon}
                    alt=""
                />
                <img
                    className='w-4 cursor-pointer'
                    src={assets.volume_icon}
                    alt=""
                />
                <div className='w-20 bg-slate-50 h-1 rounded'>

                </div>
                <img
                    className='w-4 cursor-pointer'
                    src={assets.mini_player_icon}
                    alt=""
                />
                <img
                    className='w-4 cursor-pointer'
                    src={assets.zoom_icon}
                    alt="Fullscreen"
                />
            </div>
        </div>
    ) : null
};

export default Player;
