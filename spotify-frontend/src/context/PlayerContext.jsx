import { createContext, useEffect, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { fetchAndParseLRC } from "../utils/lrcParser";
import { API_BASE_URL } from "../config/api";

export const PlayerContext = createContext();

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
    const [artistsData, setArtistsData] = useState([]);
    const [genresData, setGenresData] = useState([]);
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
    // Playback navigation
    const [queue, setQueue] = useState([]); // array of songIds
    const [history, setHistory] = useState([]); // stack of songIds

    const findCurrentTrackIndex = useCallback(() => {
        if (!track || !track._id) return -1;
        return songsData.findIndex(item => item._id === track._id);
    }, [songsData, track]);

    const resolveSongById = useCallback((id) => {
        if (!id) return null;
        return songsData.find(item => item._id === id) || null;
    }, [songsData]);

    const playTrackById = useCallback((id, options = {}) => {
        const { pushHistory = true } = options;
        const selectedTrack = resolveSongById(id);
        if (!selectedTrack) return false;

        if (pushHistory && track && track._id && track._id !== selectedTrack._id) {
            setHistory(prev => [...prev, track._id]);
        }

        setTrack(selectedTrack);
        setPlayOnLoad(true);
        setLoopCount(0);
        return true;
    }, [resolveSongById, track]);
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
        const audio = audioRef.current;
        if (!audio || !audio.src) return;
        try {
            await audio.play();
            setPlayStatus(true);
        } catch (error) {
            console.error("Error in play function:", error);
            setPlayStatus(false);
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
        const selectedTrack = resolveSongById(id);
        if (!selectedTrack) return;

        // Same track: just resume if paused
        if (track && track._id === selectedTrack._id) {
            if (audioRef.current?.paused) await play();
            return;
        }

        playTrackById(selectedTrack._id, { pushHistory: true });
    }

    const previousSong = async () => {
        // Spec: previous song is previous in history
        setHistory(prevHistory => {
            if (prevHistory.length === 0) return prevHistory;
            const prevId = prevHistory[prevHistory.length - 1];
            // Play without pushing current track back into history
            playTrackById(prevId, { pushHistory: false });
            return prevHistory.slice(0, -1);
        });
    }

    const nextSong = async () => {
        // Spec: next song is based on the queue
        setQueue(prevQueue => {
            if (prevQueue.length === 0) return prevQueue;
            const [nextId, ...rest] = prevQueue;
            playTrackById(nextId, { pushHistory: true });
            return rest;
        });
    }

    const seekSong = async (e) => {
        audioRef.current.currentTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration)
    }

    const getSongsData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/song/list`);
            setSongsData(response.data.songs);
            setTrack(response.data.songs[0]);
        } catch (error) {
            console.log('error getSongsData', error);
        }
    }

    const getAlbumsData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/album/list`);
            setAlbumsData(response.data.albums);
        } catch (error) {
            console.log('error getSongsData', error);
        }
    }

    const getArtistsData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/artist/list`);
            setArtistsData(response.data.artists || []);
        } catch (error) {
            console.log('error getArtistsData', error);
        }
    }

    const getGenresData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/genre/list`);
            setGenresData(response.data.genres || []);
        } catch (error) {
            console.log('error getGenresData', error);
        }
    }

    useEffect(() => {
        getAlbumsData();
        getSongsData();
        getArtistsData();
        getGenresData();
    }, [])

    const playRandomSong = async () => {
        if (songsData.length <= 1) return;
        
        const currentIndex = findCurrentTrackIndex();
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songsData.length);
        } while (randomIndex === currentIndex);
        
        playTrackById(songsData[randomIndex]._id, { pushHistory: true });
    }

    const addToQueue = (songId) => {
        if (!songId) return;
        setQueue(prev => [...prev, songId]);
    };

    const setQueueFromSongs = (songIds = []) => {
        setQueue(Array.isArray(songIds) ? songIds.filter(Boolean) : []);
    };

    const clearQueue = () => setQueue([]);

    const playFromQueueAt = (index) => {
        setQueue(prev => {
            if (!Array.isArray(prev) || index < 0 || index >= prev.length) return prev;
            const songId = prev[index];
            const rest = prev.filter((_, i) => i !== index);
            playTrackById(songId, { pushHistory: true });
            return rest;
        });
    };

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
                        // If the user has an explicit queue, consume it first.
                        // Otherwise loop through the library order.
                        if (queue.length > 0) {
                            await nextSong();
                        } else {
                            const currentIndex = findCurrentTrackIndex();
                            if (songsData.length > 0) {
                                const nextIndex = currentIndex >= 0 && currentIndex < songsData.length - 1 ? currentIndex + 1 : 0;
                                playTrackById(songsData[nextIndex]._id, { pushHistory: true });
                            }
                        }
                        break;
                    case LOOP_MODE.NO_LOOP:
                    default:
                        setPlayStatus(false);
                        setActiveLyricIndex(-1);
                        if (queue.length > 0) {
                            await nextSong();
                        } else if (shuffleMode) {
                            await playRandomSong();
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
            audio.removeEventListener('canplay', handleCanPlay);

            // Set new source and load
            if (audio.src !== track.file) { // Only update if src is different
                audio.src = track.file;
                audio.load(); // Important: load the new source
            }

            // Add event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleSongEnd);
            audio.addEventListener('canplay', handleCanPlay);

            if (playOnLoad) {
                // Try immediately (best-effort). If not ready, 'canplay' will fire later.
                setTimeout(() => handleCanPlay(), 0);
            }

            // Cleanup function for when the component unmounts or track changes again
            return () => {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleSongEnd);
                audio.removeEventListener('canplay', handleCanPlay);
            };
        }
    }, [track, playOnLoad, loopMode, loopCount, activeLyricIndex, currentLyrics.length, volume, isMuted, currentLyricsSource, shuffleMode, findCurrentTrackIndex, playRandomSong, nextSong]); // Rerun when track or playOnLoad changes

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
        playTrackById,
        currentLyrics, activeLyricIndex, 
        showLyrics, setShowLyrics, toggleLyrics,
        previousSong, nextSong, seekSong,
        songsData, albumsData,
        artistsData, genresData,
        setPlayOnLoad,
        loopMode, toggleLoopMode, LOOP_MODE,
        shuffleMode, toggleShuffleMode,
        volume, changeVolume,
        isMuted, toggleMute,
        showFullscreen, toggleBrowserFullscreen,
        showQueue, setShowQueue, toggleQueue,
        queue, setQueueFromSongs, addToQueue, clearQueue, playFromQueueAt,
        history,
    }

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    )

}

export default PlayerContextProvider