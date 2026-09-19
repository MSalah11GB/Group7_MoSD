import { createContext, useContext } from 'react';

const DEFAULT_TIME = {
    currentTime: 0,
    duration: 0,
    progress: 0,
    time: { currentTime: { minute: 0, second: 0 }, totalTime: { minute: 0, second: 0 } },
};

// Playback position ticks several times a second, so it lives in its own context: only the
// seek bar and the lyrics re-render on every tick, not every component that uses the player.
export const PlayerTimeContext = createContext(DEFAULT_TIME);

export const usePlayerTime = () => useContext(PlayerTimeContext);
