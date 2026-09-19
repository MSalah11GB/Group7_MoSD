import { EMPTY, useLyricsQuery } from '../api/queries';

/** Parsed lyric lines of the given track (cached per lyrics file), or none. */
export const useLyrics = (track) => {
    const { data, isLoading } = useLyricsQuery(track?.lrcFile);
    return { currentLyrics: data ?? EMPTY, lyricsLoading: isLoading };
};
