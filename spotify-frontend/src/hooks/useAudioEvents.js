import { useEffect, useRef, useState } from 'react';

/**
 * Mirrors the audio element's play/pause state into React and reports when a track finishes.
 * Listeners are attached once; the latest onEnded is always the one called.
 */
export const useAudioEvents = (audioRef, onEnded) => {
    const [playing, setPlaying] = useState(false);
    const onEndedRef = useRef(onEnded);

    useEffect(() => {
        onEndedRef.current = onEnded;
    });

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const handlers = {
            play: () => setPlaying(true),
            pause: () => setPlaying(false),
            ended: () => onEndedRef.current?.(),
        };
        Object.entries(handlers).forEach(([event, handler]) => audio.addEventListener(event, handler));
        return () => Object.entries(handlers).forEach(([event, handler]) => audio.removeEventListener(event, handler));
    }, [audioRef]);

    return { playing };
};
