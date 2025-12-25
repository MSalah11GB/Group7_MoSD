import { createContext, useEffect, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { fetchAndParseLRC } from "../utils/lrcParser";

export const PlayerContext = createContext();

const url = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const LOOP_MODE = {
    NO_LOOP: 0, // Song plays once, then stops
    LOOP_ONE: 1, // Song plays twice, then stops
    LOOP_ALL: 2  // Song loops indefinitely
};

const PlayerContextProvider = (props) => {
    const audioRef = useRef();
    const seekBar = useRef();
    const seekBg = useRef();
    const [songsData, setSongsData] = useState([]);
    const [albumsData, setAlbumsData] = useState([]);
    const [track, setTrack] = useState(songsData[0]);
    const [playStatus, setPlayStatus] = useState(false);
    const [loopMode, setLoopMode] = useState(LOOP_MODE.NO_LOOP);
    const [loopCount, setLoopCount] = useState(0);
    const [currentLyrics, setCurrentLyrics] = useState([]);
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const [showLyrics, setShowLyrics] = useState(false);
    const [shuffleMode, setShuffleMode] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1);
    const [currentLyricsSource, setCurrentLyricsSource] = useState('');
    const [time, setTime] = useState({
        currentTime: { second: 0, minute: 0 },
        totalTime: { second: 0, minute: 0 }
    });
    const [playOnLoad, setPlayOnLoad] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    useEffect(() => {
        // Initialize audio element properties when component mounts
        const audio = audioRef.current;
        if (audio) {
            audio.volume = volume;
            audio.muted = isMuted;
        }
    }, []);

    const changeVolume = useCallback((newVolumeLevel) => {
        if (!audioRef.current) return;

        let newVolume = parseFloat(newVolumeLevel);
        newVolume = Math.max(0, Math.min(1, newVolume)); // Clamp between 0 and 1

        setVolume(newVolume);
        audioRef.current.volume = newVolume;

        if (newVolume > 0 && audioRef.current.muted) { // If volume is adjusted to be > 0, unmute the player
            audioRef.current.muted = false;
            setIsMuted(false);
        }
    }, [setIsMuted]);

    const toggleMute = useCallback(() => {
        if (!audioRef.current) return;

        const newMutedStatus = !audioRef.current.muted;
        audioRef.current.muted = newMutedStatus;
        setIsMuted(newMutedStatus);

        if (newMutedStatus) { // Just muted
            setPreviousVolume(volume); // Store current volume before muting
        } else { // Just unmuted
            // If volume was 0 when unmuting, restore to previousVolume or a default
            if (volume === 0) {
                const volumeToRestore = previousVolume > 0 ? previousVolume : 0.5;
                setVolume(volumeToRestore);
                audioRef.current.volume = volumeToRestore;
            } // If volume > 0, it's already set by the slider/changeVolume, no need to change here.
        }
    }, [volume, previousVolume, setIsMuted, setVolume]);

    useEffect(() => {
        setTimeout(() => {
            audioRef.current.ontimeupdate = () => {
                seekBar.current.style.width = (Math.floor(audioRef.current.currentTime / audioRef.current.duration * 100)) + "%";
                setTime({
                    currentTime: {
                        second: Math.floor(audioRef.current.currentTime % 60),
                        minute: Math.floor(audioRef.current.currentTime / 60)
                    },
                    totalTime: {
                        second: Math.floor(audioRef.current.duration % 60),
                        minute: Math.floor(audioRef.current.duration / 60)
                    }
                })
            }
        }, 1000)
    }, [audioRef])

    const play = async () => {
        if (audioRef.current && audioRef.current.src && audioRef.current.paused) {
            try {
                await audioRef.current.play();
                setPlayStatus(true);
            } catch (error) {
                console.error("Error in play function:", error);
                setPlayStatus(false);
            }
        }
    }

    const pause = () => {
        audioRef.current.pause();
        setPlayStatus(false);
    }

    const toggleLoopMode = () => {
        setLoopMode(prevMode => {
            const nextMode = (prevMode + 1) % 3; // Cycle through 0, 1, 2
            if (nextMode !== LOOP_MODE.LOOP_ONE) { // Reset loopCount if not entering LOOP_ONE
                setLoopCount(0);
            }
            return nextMode;
        });
    };

    const toggleShuffleMode = () => {
        setShuffleMode(prev => !prev);
    }

    const playWithId = async (id) => {
        const selectedTrack = songsData.find(item => item._id === id);
        if (selectedTrack) {
            if (track && track._id === selectedTrack._id && !audioRef.current.paused) {
            } else if (track && track._id === selectedTrack._id && audioRef.current.paused) {
                await play();
            } else {
                setTrack(selectedTrack);
                setPlayOnLoad(true); 
                setLoopCount(0); 
            }
        }
    }

    const previousSong = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex > 0) {
            setTrack(songsData[currentIndex - 1]);
            setPlayOnLoad(true);
            setLoopCount(0);
        }
    }

    const nextSong = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex < songsData.length - 1) {
            setTrack(songsData[currentIndex + 1]);
            setPlayOnLoad(true);
            setLoopCount(0);
        } else if (loopMode === LOOP_MODE.LOOP_ALL && songsData.length > 0) { // Loop back to first song if LOOP_ALL
            setTrack(songsData[0]);
            setPlayOnLoad(true);
            setLoopCount(0);
        }
    }

    const seekSong = async (e) => {
        audioRef.current.currentTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration)
    }

    const getSongsData = async () => {
        try {
            const response = await axios.get(`${url}/api/song/list`);
            setSongsData(response.data.songs);
            setTrack(response.data.songs[0]);
        } catch (error) {
            console.log('error getSongsData', error);
        }
    }

    const getAlbumsData = async () => {
        try {
            const response = await axios.get(`${url}/api/album/list`);
            setAlbumsData(response.data.albums);
        } catch (error) {
            console.log('error getSongsData', error);
        }
    }

    useEffect(() => {
        getAlbumsData();
        getSongsData();
    }, [])

    const playRandomSong = async () => {
        if (songsData.length <= 1) return;
        
        const currentIndex = findCurrentTrackIndex();
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songsData.length);
        } while (randomIndex === currentIndex);
        
        setTrack(songsData[randomIndex]);
        setPlayOnLoad(true);
    }

    // Toggle browser fullscreen mode
    const toggleBrowserFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.error("Fullscreen error:", err);
            }
        } else await document.exitFullscreen();
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setShowFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () =>
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Toggle the Queue view
    const toggleQueue = () => {
        setShowQueue(prev => !prev);
    };

    // Effect to handle track changes: update src, load, and play if intended
    useEffect(() => {
        if (track && track.file) { // track.file should be the audio URL
            const audio = audioRef.current;

            const fetchLyrics = async () => {
                if (track.lrcFile) {
                    try {
                        // Show loading state only if we're fetching new lyrics
                        if (track.lrcFile !== currentLyricsSource) {
                            setCurrentLyrics([]);
                            setActiveLyricIndex(-1);

                            const parsedLyrics = await fetchAndParseLRC(track.lrcFile);
                            if (parsedLyrics.length > 0) {
                                setCurrentLyrics(parsedLyrics);
                                setCurrentLyricsSource(track.lrcFile);
                            }
                        }
                    } catch (error) {
                        console.error("Error loading lyrics:", error);
                    }
                } else {
                    // Only clear lyrics if we had some before
                    if (currentLyrics.length > 0) {
                        setCurrentLyrics([]);
                        setActiveLyricIndex(-1);
                        setCurrentLyricsSource('');
                    }
                }
            };

            fetchLyrics();

            const handleLoadedMetadata = () => {
                setTime(prev => ({
                    ...prev,
                    totalTime: {
                        second: Math.floor(audio.duration % 60),
                        minute: Math.floor(audio.duration / 60)
                    }
                }));
            };

            // Event listener for time updates
            const handleTimeUpdate = () => {
                if (seekBar.current) { // Ensure seekBar ref is available
                    seekBar.current.style.width = (Math.floor(audio.currentTime / audio.duration * 100)) + '%';
                }
                setTime(prev => ({
                    ...prev,
                    currentTime: {
                        second: Math.floor(audio.currentTime % 60),
                        minute: Math.floor(audio.currentTime / 60)
                    }
                }));
                const currentTimeMs = audio.currentTime * 1000;
                if (currentLyrics.length > 0) {
                    let newActiveIndex = -1;
                    for (let i = 0; i < currentLyrics.length; i++) {
                        if (currentLyrics[i].time <= currentTimeMs) {
                            newActiveIndex = i;
                        } else {
                            break;
                        }
                    }
                    if (newActiveIndex !== activeLyricIndex) {
                        setActiveLyricIndex(newActiveIndex);
                    }
                }
            };
            
            // Event listener for when the song ends
            const handleSongEnd = async () => {
                switch (loopMode) {
                    case LOOP_MODE.LOOP_ONE:
                        if (loopCount < 1) { // Play once more (total 2 times)
                            setLoopCount(prev => prev + 1);
                            audio.currentTime = 0;
                            await play();
                        } else {
                            setPlayStatus(false);
                            setLoopCount(0); // Reset for next time
                        }
                        break;
                    case LOOP_MODE.LOOP_ALL:
                        audio.currentTime = 0;
                        await play();
                        break;
                    case LOOP_MODE.NO_LOOP:
                    default:
                        setPlayStatus(false);
                        setActiveLyricIndex(-1);
                        if (hasNext) {
                            if (shuffleMode) await playRandomSong();
                            else await next();
                        }
                        break;
                }
            };

            const handleCanPlay = async () => {
                if (playOnLoad) {
                    try {
                        await audio.play();
                        setPlayStatus(true);
                        setPlayOnLoad(false); // Reset the flag
                    } catch (error) {
                        console.error("Error playing audio in handleCanPlay:", error);
                        setPlayStatus(false); // Ensure UI reflects paused state on error
                        setPlayOnLoad(false);
                    }
                }
            };
            
            // Clean up previous event listeners before adding new ones
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleSongEnd);
            audio.removeEventListener('canplaythrough', handleCanPlay); // or 'canplay'

            // Set new source and load
            if (audio.src !== track.file) { // Only update if src is different
                audio.src = track.file;
                audio.load(); // Important: load the new source
            }

            // Add event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleSongEnd);
            audio.addEventListener('canplaythrough', handleCanPlay); // or 'canplay'

            if (playOnLoad && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                 handleCanPlay();
            }

            // Cleanup function for when the component unmounts or track changes again
            return () => {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleSongEnd);
                audio.removeEventListener('canplaythrough', handleCanPlay);
            };
        }
    }, [track, playOnLoad, loopMode, loopCount, activeLyricIndex, currentLyrics.length, volume, isMuted, currentLyricsSource]); // Rerun when track or playOnLoad changes

    const toggleLyrics = () => {
        if (currentLyrics && currentLyrics.length > 0) {
            setShowLyrics(prev => !prev);
        }
    };

    const contextValue = {
        audioRef,
        seekBar,
        seekBg,
        track, setTrack,
        playStatus, setPlayStatus,
        time, setTime,
        play, pause,
        playWithId,
        currentLyrics, activeLyricIndex, 
        showLyrics, setShowLyrics, toggleLyrics,
        previousSong, nextSong, seekSong,
        songsData, albumsData,
        setPlayOnLoad,
        loopMode, toggleLoopMode, LOOP_MODE,
        shuffleMode, toggleShuffleMode,
        volume, changeVolume,
        isMuted, toggleMute,
        showFullscreen, toggleBrowserFullscreen,
        showQueue, setShowQueue, toggleQueue,
    }

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    )

}

export default PlayerContextProvider