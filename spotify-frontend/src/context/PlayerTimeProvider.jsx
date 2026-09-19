import { useEffect, useMemo, useState } from 'react';
import { toClock } from '../lib/catalog';
import { PlayerTimeContext } from './PlayerTimeContext';

const PlayerTimeProvider = ({ audioRef, children }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        const handlers = {
            timeupdate: () => setCurrentTime(audio.currentTime),
            loadedmetadata: syncDuration,
            durationchange: syncDuration,
            emptied: () => {
                setCurrentTime(0);
                setDuration(0);
            },
        };
        Object.entries(handlers).forEach(([event, handler]) => audio.addEventListener(event, handler));
        return () => Object.entries(handlers).forEach(([event, handler]) => audio.removeEventListener(event, handler));
    }, [audioRef]);

    const value = useMemo(
        () => ({
            currentTime,
            duration,
            progress: duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0,
            time: { currentTime: toClock(currentTime), totalTime: toClock(duration) },
        }),
        [currentTime, duration]
    );

    return <PlayerTimeContext.Provider value={value}>{children}</PlayerTimeContext.Provider>;
};

export default PlayerTimeProvider;
