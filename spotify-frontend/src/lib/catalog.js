// Pure helpers for reading the catalog. The API returns populated references (artists, genres)
// as objects and unpopulated ones as ids, so every comparison goes through idOf().

export const idOf = (value) => (value && typeof value === 'object' ? value._id : value);

const asList = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

export const durationToSeconds = (duration) => {
    if (!duration) return 0;
    const [minutes, seconds] = String(duration).split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
};

/** "about 3 min" / "about 1 hr 5 min"; empty string for no songs. */
export const formatTotalDuration = (songs) => {
    if (!songs || songs.length === 0) return '';

    const totalMinutes = Math.floor(songs.reduce((sum, song) => sum + durationToSeconds(song.duration), 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `about ${hours} hr ${minutes > 0 ? `${minutes} min` : ''}`.trim() : `about ${minutes} min`;
};

export const songsForArtist = (songs, artistId) =>
    songs.filter((song) => asList(song.artist).some((artist) => idOf(artist) === artistId));

export const songsForGenre = (songs, genreId) =>
    songs.filter((song) => asList(song.genres).some((genre) => idOf(genre) === genreId));

/** Songs reference their album by id; songs from before that change are matched by name. */
export const songsForAlbum = (songs, album) =>
    songs.filter((song) => (song.albumId ? idOf(song.albumId) === album._id : song.album === album.name));

const hasAlbum = (song) => Boolean(song.album) && song.album !== 'none';

/** Splits songs into { byAlbum: { [albumName]: songs }, singles } keeping first-seen order. */
export const splitByAlbum = (songs) => {
    const byAlbum = {};
    const singles = [];
    for (const song of songs) {
        if (hasAlbum(song)) (byAlbum[song.album] ??= []).push(song);
        else singles.push(song);
    }
    return { byAlbum, singles };
};

/** Groups songs under their first artist's id. */
export const groupByFirstArtist = (songs) => {
    const groups = {};
    for (const song of songs) {
        const artistId = idOf(asList(song.artist)[0]);
        if (artistId) (groups[artistId] ??= []).push(song);
    }
    return groups;
};

/** Index of the last lyric line whose timestamp has been reached, or -1. Lines are sorted by time. */
export const activeLyricIndex = (lines, currentTimeMs) => {
    let active = -1;
    for (let i = 0; i < lines.length && lines[i].time <= currentTimeMs; i++) active = i;
    return active;
};

export const toClock = (seconds) => {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    return { minute: Math.floor(safe / 60), second: Math.floor(safe % 60) };
};

export const formatClock = ({ minute, second }) => `${minute}:${String(second).padStart(2, '0')}`;
