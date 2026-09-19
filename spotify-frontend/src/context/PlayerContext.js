import { createContext } from 'react';

export const LOOP_MODE = {
    NO_LOOP: 0, // Song plays once, then stops
    LOOP_ONE: 1, // Song plays twice, then stops
    LOOP_ALL: 2, // Song loops indefinitely
};

export const PlayerContext = createContext(null);
