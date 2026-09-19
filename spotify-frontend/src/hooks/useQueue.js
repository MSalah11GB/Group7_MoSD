import { useState } from 'react';

/** The play queue (ids waiting to play) and the history (ids already played, most recent last). */
export const useQueue = () => {
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);

    return {
        queue,
        history,
        setQueue,
        setHistory,
        addToQueue: (songId) => {
            if (songId) setQueue((current) => [...current, songId]);
        },
        setQueueFromSongs: (songIds = []) => setQueue(Array.isArray(songIds) ? songIds.filter(Boolean) : []),
        clearQueue: () => setQueue([]),
    };
};
