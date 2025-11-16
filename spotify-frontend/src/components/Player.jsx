// Musicify-frontend/src/components/Player.jsx
import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import { assets, songsData } from '../assets/assets'; 
//import { PlayerContext } from '../context/PlayerContext';

const Player = () => {
    return (
        <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
            <div className='hidden lg:flex items-center gap-4'>
                <img className='w-12' src={songsData[0].image} alt="" />
                <div>
                    <p>{songsData[0].name}</p>
                    <p>{songsData[0].desc.slice(0,12)}</p>
                </div>
            </div>
            <div className='flex flex-col items-center gap-1 m-auto'>
                <div className='flex gap-4'>
                    <img
                        className='w-4 cursor-pointer'
                        src={assets.shuffle_icon}
                        alt="Shuffle"
                    />
                    <img
                        className='w-4'
                        src={assets.prev_icon}
                        alt="Previous"
                    />
                    <img
                        className='w-4'
                        src={assets.play_icon}
                        alt="Next"
                    />
                    <img
                        className='w-4 cursor-pointer'
                        src={assets.loop_icon}
                        alt="Loop"
                    />
                </div>
                <div className='flex items-center gap-5'>
                    <p>1:06</p>
                    <div className='w-[50vw] md:w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer'>
                        <hr className='h-1 border-none w-10 bg-green-800 rounded-full' />
                    </div>
                    <p>3:20</p>
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
    )
};

export default Player;
