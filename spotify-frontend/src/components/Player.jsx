import React, { useContext, useRef, useState, useCallback, useEffect } from 'react';
import { assets } from '../assets/assets'; 
import { PlayerContext } from '../context/PlayerContext';

const Player = () => {

    const { track, seekBar, seekBg, play, pause, playStatus, time, 
        nextSong, previousSong, seekSong, loopMode, toggleLoopMode, LOOP_MODE, 
        shuffleMode, toggleShuffleMode, 
        volume, changeVolume, isMuted, toggleMute,
        showFullscreen, toggleBrowserFullscreen,
        showQueue, toggleQueue,
        toggleLyrics, currentLyrics, showLyrics 
    } = useContext(PlayerContext)

    const getLoopIconStyle = () => {
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                return { filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(80deg)' }; // Example: Greenish tint
            case LOOP_MODE.LOOP_ALL:
                return { filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(180deg)' }; // Example: Blueish tint
            default:
                return {}; // Default style
        }
    };

    const getShuffleIconStyle = () => {
        return shuffleMode ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {};
    };

    const getLoopIcon = () => {
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                return assets.loop1_icon || assets.loop_icon;
            case LOOP_MODE.LOOP_ALL:
                return assets.loopall_icon;
            case LOOP_MODE.NO_LOOP:
            default:
                return assets.loop_icon;
        }
    }

    const volumeBarBgRef = useRef(null);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);

    const calculateVolumeFromEvent = useCallback((event, barRef) => {
        if (!barRef.current) return volume;
        const rect = barRef.current.getBoundingClientRect();
        let relativeX = event.clientX - rect.left;
        let newVolume = relativeX / rect.width;
        newVolume = Math.max(0, Math.min(1, newVolume));
        return newVolume;
    }, [volume]);

    const handleVolumeInteraction = useCallback((event) => {
        const newVolume = calculateVolumeFromEvent(event, volumeBarBgRef);
        if (newVolume !== volume || (newVolume === 0 && isMuted)) {
            changeVolume(newVolume);
        }
    }, [calculateVolumeFromEvent, changeVolume, volumeBarBgRef, volume, isMuted]);

    const handleMouseDownVolume = useCallback((event) => {
        setIsDraggingVolume(true);
        handleVolumeInteraction(event);
    }, [handleVolumeInteraction]);

    const toggleFullscreen = () => {
        //setShowFullscreen(prev => !prev);
        toggleBrowserFullscreen();
    };

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (isDraggingVolume) {
                handleVolumeInteraction(event);
            }
        };
        const handleMouseUp = () => {
            if (isDraggingVolume) {
                setIsDraggingVolume(false);
            }
        };
        if (isDraggingVolume) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingVolume, handleVolumeInteraction]);

    const displayVolumePercentage = (isMuted ? 0 : volume) * 100;

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
                    <img onClick = {toggleShuffleMode} className='w-4 cursor-pointer' src={assets.shuffle_icon} style={getShuffleIconStyle()} alt="Shuffle" />
                    <img onClick = {previousSong} className='w-4 cursor-pointer' src={assets.prev_icon} alt="Previous" />
                    {!playStatus ? (
                        <img onClick={play} className='w-4 cursor-pointer' src={assets.play_icon} alt="play_icon" />
                    ) : (
                        <img onClick={pause} className='w-4 cursor-pointer' src={assets.pause_icon} alt="S" />
                    )}
                    <img onClick = {nextSong} className='w-4 cursor-pointer' src={assets.next_icon} alt="Next" />
                    <img onClick={toggleLoopMode} className='w-4 cursor-pointer' src={getLoopIcon()} // Use function to get potentially different icons
                        style={getLoopIconStyle()}
                        alt="Loop" 
                        title={ loopMode === LOOP_MODE.NO_LOOP ? "Loop: Off" : loopMode === LOOP_MODE.LOOP_ONE ? "Loop: One" : "Loop: All"
                        } // Add a title for better UX
                    />
                </div>
                <div className='flex items-center gap-5'>
                    <p className='w-8 text-center'>{time.currentTime.minute}:{time.currentTime.second < 10 ? `0${time.currentTime.second}` : time.currentTime.second}</p>
                    <div ref = {seekBg} onClick = {seekSong} className='w-[50vw] md:w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer'>
                        <hr ref = {seekBar} className='h-1 border-none w-10 bg-green-800 rounded-full' />
                    </div>
                    <p className='w-8 text-center'>{time.totalTime.minute}:{time.totalTime.second < 10 ? `0${time.totalTime.second}` : time.totalTime.second}</p>
                </div>
            </div>

            <div className='hidden lg:flex items-center gap-3 opacity-75'>
                <div
                    onClick={toggleLyrics}
                    className={`relative cursor-pointer ${currentLyrics && currentLyrics.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={currentLyrics && currentLyrics.length > 0 ? (showLyrics ? "Hide Lyrics" : "Show Lyrics") : "No lyrics available"}
                >
                    <img
                        className="w-4"
                        src={assets.mic_icon}
                        alt="Lyrics"
                    />
                    {currentLyrics && currentLyrics.length > 0 && (
                        <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${showLyrics ? 'bg-green-500' : 'bg-white'}`}></div>
                    )}
                </div>
                <img onClick={toggleQueue} className='w-4 cursor-pointer' src={assets.queue_icon} alt="Queue"
                    title={showQueue ? "Hide Queue" : "Show Queue"}
                    style={showQueue ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {}} />

                <img className='w-4 cursor-pointer' src={assets.plays_icon} alt="Plays" />
                
                <img onClick={toggleMute} className='w-4 cursor-pointer' src={isMuted ? (assets.mute_icon) : assets.volume_icon}
                    alt={isMuted ? "Unmute" : "Mute"} title={isMuted ? "Unmute" : "Mute"} />

                <div
                    ref={volumeBarBgRef}
                    onMouseDown={handleMouseDownVolume}
                    className='w-24 h-1 bg-slate-300 rounded-full cursor-pointer relative group flex items-center'
                    title={`Volume: ${Math.round(volume * 100)}%`}
                >
                <div className='h-1 bg-green-500 rounded-l-full pointer-events-none'
                    style={{ width: `${displayVolumePercentage}%`, ...(displayVolumePercentage === 100 && { borderRadius: '9999px' }) }}
                />
                <div className='absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity'
                    style={{ left: `calc(${displayVolumePercentage}% - 6px)` }}
                />
            </div>

            <img className='w-4 cursor-pointer' src={assets.mini_player_icon} alt="Mini player" />

            <img onClick={toggleFullscreen} className='w-4 cursor-pointer' src={assets.zoom_icon} alt="Fullscreen"
                title={showFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                style={showFullscreen ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {}}
            />
        </div>
    </div>
    ) : null
};

export default Player;
