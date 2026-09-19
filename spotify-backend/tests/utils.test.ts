import { describe, expect, it } from 'vitest';
import { buildMongoUri } from '../src/config/mongodb.js';
import { formatDuration } from '../src/services/mediaService.js';
import { normalizeGenreName } from '../src/services/genreService.js';
import { escapeRegex } from '../src/utils/regexUtils.js';
import { extractSpotifyTrackId } from '../src/utils/spotify.js';

describe('escapeRegex', () => {
  it('neutralizes regex metacharacters', () => {
    const escaped = escapeRegex('a.b*c(d)+[e]');
    expect(new RegExp(`^${escaped}$`).test('a.b*c(d)+[e]')).toBe(true);
    expect(new RegExp(`^${escaped}$`).test('aXb*c(d)+[e]')).toBe(false);
  });
});

describe('normalizeGenreName', () => {
  it('strips punctuation, whitespace and case', () => {
    expect(normalizeGenreName('  Hip-Hop!!  ')).toBe('hiphop');
    expect(normalizeGenreName('R&B / Soul')).toBe('rbsoul');
    expect(normalizeGenreName('')).toBe('');
    expect(normalizeGenreName(undefined)).toBe('');
  });
});

describe('formatDuration', () => {
  it('zero-pads seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(59.9)).toBe('0:59');
    expect(formatDuration(600)).toBe('10:00');
  });
});

describe('extractSpotifyTrackId', () => {
  it('parses track urls only', () => {
    expect(extractSpotifyTrackId('https://open.spotify.com/track/ABC123')).toBe('ABC123');
    expect(extractSpotifyTrackId('https://open.spotify.com/album/ABC123')).toBeNull();
  });
});

describe('buildMongoUri', () => {
  it('appends a default db name only when missing', () => {
    expect(buildMongoUri('mongodb://localhost:27017', 'Musicify')).toBe('mongodb://localhost:27017/Musicify');
    expect(buildMongoUri('mongodb://localhost:27017/', 'Musicify')).toBe('mongodb://localhost:27017/Musicify');
    expect(buildMongoUri('mongodb://localhost:27017/custom', 'Musicify')).toBe('mongodb://localhost:27017/custom');
    expect(buildMongoUri('mongodb+srv://u:p@c.example.net?retryWrites=true', 'Musicify')).toBe(
      'mongodb+srv://u:p@c.example.net/Musicify?retryWrites=true'
    );
  });

  it('throws without a uri', () => {
    expect(() => buildMongoUri(undefined, 'x')).toThrow('MONGODB_URI is required');
  });
});
