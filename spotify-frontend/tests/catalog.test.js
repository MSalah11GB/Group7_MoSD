import { describe, expect, test } from 'vitest';
import {
    activeLyricIndex,
    durationToSeconds,
    formatClock,
    formatTotalDuration,
    groupByFirstArtist,
    idOf,
    songsForAlbum,
    songsForArtist,
    songsForGenre,
    splitByAlbum,
    toClock,
} from '../src/lib/catalog.js';
import { albums, songs } from './helpers/fixtures.js';

describe('idOf', () => {
    test('reads the id of populated objects and passes ids through', () => {
        expect(idOf({ _id: 'a1', name: 'x' })).toBe('a1');
        expect(idOf('a1')).toBe('a1');
        expect(idOf(null)).toBeNull();
        expect(idOf(undefined)).toBeUndefined();
    });
});

describe('song selectors', () => {
    test('songsForArtist works with populated artist objects (what the API returns)', () => {
        expect(songsForArtist(songs, 'a1').map((s) => s._id)).toEqual(['s1', 's2']);
        expect(songsForArtist(songs, 'a2').map((s) => s._id)).toEqual(['s3']);
        expect(songsForArtist(songs, 'nobody')).toEqual([]);
    });

    test('songsForArtist also accepts plain ids and a single (non-array) artist', () => {
        expect(songsForArtist([{ _id: 'x', artist: ['a1'] }], 'a1')).toHaveLength(1);
        expect(songsForArtist([{ _id: 'x', artist: 'a1' }], 'a1')).toHaveLength(1);
        expect(songsForArtist([{ _id: 'x' }], 'a1')).toEqual([]);
    });

    test('songsForGenre matches populated genres', () => {
        expect(songsForGenre(songs, 'g2').map((s) => s._id)).toEqual(['s2', 's3']);
    });

    test('songsForAlbum matches by albumId, falling back to the name for older songs', () => {
        expect(songsForAlbum(songs, albums[0]).map((s) => s._id)).toEqual(['s1']);
        const legacy = [{ _id: 'old', album: 'Skeletons' }];
        expect(songsForAlbum(legacy, albums[0])).toHaveLength(1);
    });

    test('splitByAlbum separates singles and groups by album name in first-seen order', () => {
        const { byAlbum, singles } = splitByAlbum(songs);
        expect(Object.keys(byAlbum)).toEqual(['Skeletons']);
        expect(singles.map((s) => s._id)).toEqual(['s2', 's3']);
    });

    test('groupByFirstArtist keys by artist id and skips songs without an artist', () => {
        const groups = groupByFirstArtist([...songs, { _id: 'orphan', artist: [] }]);
        expect(Object.keys(groups)).toEqual(['a1', 'a2']);
        expect(groups.a1.map((s) => s._id)).toEqual(['s1', 's2']);
    });
});

describe('durations', () => {
    test('durationToSeconds parses m:ss and tolerates junk', () => {
        expect(durationToSeconds('3:05')).toBe(185);
        expect(durationToSeconds('0:00')).toBe(0);
        expect(durationToSeconds(undefined)).toBe(0);
        expect(durationToSeconds('abc')).toBe(0);
    });

    test('formatTotalDuration', () => {
        expect(formatTotalDuration([])).toBe('');
        expect(formatTotalDuration([{ duration: '3:05' }, { duration: '2:00' }])).toBe('about 5 min');
        expect(formatTotalDuration([{ duration: '60:00' }, { duration: '5:00' }])).toBe('about 1 hr 5 min');
        expect(formatTotalDuration([{ duration: '60:00' }])).toBe('about 1 hr');
    });

    test('toClock / formatClock', () => {
        expect(toClock(125)).toEqual({ minute: 2, second: 5 });
        expect(toClock(NaN)).toEqual({ minute: 0, second: 0 });
        expect(toClock(-3)).toEqual({ minute: 0, second: 0 });
        expect(formatClock({ minute: 2, second: 5 })).toBe('2:05');
        expect(formatClock({ minute: 0, second: 0 })).toBe('0:00');
    });
});

describe('activeLyricIndex', () => {
    const lines = [{ time: 1000 }, { time: 5000 }, { time: 9000 }];

    test('is the last line reached so far', () => {
        expect(activeLyricIndex(lines, 0)).toBe(-1);
        expect(activeLyricIndex(lines, 1000)).toBe(0);
        expect(activeLyricIndex(lines, 6000)).toBe(1);
        expect(activeLyricIndex(lines, 999999)).toBe(2);
        expect(activeLyricIndex([], 5000)).toBe(-1);
    });
});
