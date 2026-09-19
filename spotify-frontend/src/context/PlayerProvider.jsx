import { useEffect, useRef, useState } from 'react';
import { useLibrary } from '../api/queries';
import { useAudioEvents } from '../hooks/useAudioEvents';
import { useLyrics } from '../hooks/useLyrics';
import { useQueue } from '../hooks/useQueue';
import { LOOP_MODE, PlayerContext } from './PlayerContext';
import PlayerTimeProvider from './PlayerTimeProvider';

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const PlayerProvider = ({ children }) => {
    const audioRef = useRef(null);
    const seekBg = useRef(null);
    const autoplayRef = useRef(false);

    const { songsData, albumsData, artistsData, genresData, libraryStatus } = useLibrary();
    const { queue, history, setQueue, setHistory, addToQueue, setQueueFromSongs, clearQueue } = useQueue();

    const [selectedTrack, setSelectedTrack] = useState(null);
    // Until something is chosen the first song of the library is loaded (but not played).
    const track = selectedTrack ?? songsData[0] ?? null;
    const { currentLyrics, lyricsLoading } = useLyrics(track);

    const [loopMode, setLoopMode] = useState(LOOP_MODE.NO_LOOP);
    const [loopCount, setLoopCount] = useState(0);
    const [shuffleMode, setShuffleMode] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);

    const resolveSongById = (id) => songsData.find((song) => song._id === id) ?? null;

    const play = async () => {
        const audio = audioRef.current;
        if (!audio || !track) return;
        try {
            await audio.play();
        } catch (error) {
            console.error('Could not start playback:', error);
        }
    };

    const pause = () => audioRef.current?.pause();

    const playTrack = (song, { pushHistory = true } = {}) => {
        if (!song) return false;

        if (track && track._id === song._id) {
            play();
            return true;
        }

        if (pushHistory && track?._id) setHistory((current) => [...current, track._id]);
        setLoopCount(0);
        autoplayRef.current = true;
        setSelectedTrack(song);
        return true;
    };

    const playWithId = async (id) => {
        const song = resolveSongById(id);
        if (!song) return;

        if (track && track._id === song._id) {
            if (audioRef.current?.paused) await play();
            return;
        }
        playTrack(song);
    };

    const nextSong = () => {
        if (queue.length === 0) return;
        const [nextId, ...rest] = queue;
        const song = resolveSongById(nextId);
        setQueue(rest);
        if (song) playTrack(song);
    };

    const previousSong = () => {
        if (history.length === 0) return;
        const previousId = history[history.length - 1];
        setHistory(history.slice(0, -1));
        const song = resolveSongById(previousId);
        if (song) playTrack(song, { pushHistory: false });
    };

    const playFromQueueAt = (index) => {
        if (index < 0 || index >= queue.length) return;
        const song = resolveSongById(queue[index]);
        setQueue(queue.filter((_, i) => i !== index));
        if (song) playTrack(song);
    };

    const playRandomSong = () => {
        if (songsData.length <= 1) return;
        const currentIndex = songsData.findIndex((song) => song._id === track?._id);
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songsData.length);
        } while (randomIndex === currentIndex);
        playTrack(songsData[randomIndex]);
    };

    const playNextInLibrary = () => {
        if (songsData.length === 0) return;
        const currentIndex = songsData.findIndex((song) => song._id === track?._id);
        const nextIndex = currentIndex >= 0 && currentIndex < songsData.length - 1 ? currentIndex + 1 : 0;
        playTrack(songsData[nextIndex]);
    };

    const handleEnded = () => {
        const audio = audioRef.current;
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                if (loopCount < 1) {
                    // Plays through once more (twice in total), then stops.
                    setLoopCount(loopCount + 1);
                    if (audio) audio.currentTime = 0;
                    play();
                } else {
                    setLoopCount(0);
                }
                break;
            case LOOP_MODE.LOOP_ALL:
                // An explicit queue is consumed first; otherwise the library order loops.
                if (queue.length > 0) nextSong();
                else playNextInLibrary();
                break;
            default:
                if (queue.length > 0) nextSong();
                else if (shuffleMode) playRandomSong();
        }
    };

    const { playing } = useAudioEvents(audioRef, handleEnded);

    // Start playback once the audio element has switched to a track the user asked to play.
    useEffect(() => {
        if (!autoplayRef.current) return;
        autoplayRef.current = false;
        audioRef.current?.play().catch((error) => console.error('Could not start playback:', error));
    }, [track?._id]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        audio.muted = isMuted;
    }, [volume, isMuted]);

    useEffect(() => {
        const onFullscreenChange = () => setShowFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const changeVolume = (level) => {
        const next = clamp01(parseFloat(level));
        if (Number.isNaN(next)) return;
        setVolume(next);
        if (next > 0 && isMuted) setIsMuted(false);
    };

    const toggleMute = () => {
        if (isMuted) {
            setIsMuted(false);
            if (volume === 0) setVolume(previousVolume > 0 ? previousVolume : 0.5);
        } else {
            setPreviousVolume(volume);
            setIsMuted(true);
        }
    };

    const toggleLoopMode = () => {
        const next = (loopMode + 1) % 3;
        setLoopMode(next);
        if (next !== LOOP_MODE.LOOP_ONE) setLoopCount(0);
    };

    const seekSong = (event) => {
        const audio = audioRef.current;
        const bar = seekBg.current;
        if (!audio || !bar || !audio.duration) return;
        audio.currentTime = (event.nativeEvent.offsetX / bar.offsetWidth) * audio.duration;
    };

    const toggleBrowserFullscreen = async () => {
        try {
            if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
            else await document.exitFullscreen();
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    };

    const toggleLyrics = () => {
        if (currentLyrics.length > 0) setShowLyrics((current) => !current);
    };

    const value = {
        audioRef,
        seekBg,
        track,
        playStatus: playing,
        play,
        pause,
        playTrack,
        playWithId,
        previousSong,
        nextSong,
        seekSong,
        songsData,
        albumsData,
        artistsData,
        genresData,
        libraryStatus,
        currentLyrics,
        lyricsLoading,
        showLyrics,
        setShowLyrics,
        toggleLyrics,
        loopMode,
        toggleLoopMode,
        LOOP_MODE,
        shuffleMode,
        toggleShuffleMode: () => setShuffleMode((current) => !current),
        volume,
        changeVolume,
        isMuted,
        toggleMute,
        showFullscreen,
        toggleBrowserFullscreen,
        showQueue,
        setShowQueue,
        toggleQueue: () => setShowQueue((current) => !current),
        queue,
        history,
        addToQueue,
        setQueueFromSongs,
        clearQueue,
        playFromQueueAt,
    };

    return (
        <PlayerContext.Provider value={value}>
            <PlayerTimeProvider audioRef={audioRef}>{children}</PlayerTimeProvider>
            <audio ref={audioRef} src={track?.file || undefined} preload="none" />
        </PlayerContext.Provider>
    );
};

export default PlayerProvider;
