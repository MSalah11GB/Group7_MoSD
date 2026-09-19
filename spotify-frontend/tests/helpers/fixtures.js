// Shaped like the real API responses: song.artist / song.genres arrive populated as objects,
// and song.album is the album's name while song.albumId is its id.
const artistRef = (id, name) => ({ _id: id, name, image: `${id}.png` });

export const artists = [
    { _id: 'a1', name: 'Keshi', image: 'a1.png', bgColor: '#123456', genres: ['g1', 'g2'] },
    { _id: 'a2', name: 'Other Artist', image: 'a2.png', bgColor: '#654321', genres: ['g2'] },
];

export const albums = [{ _id: 'al1', name: 'Skeletons', desc: 'A moody album', image: 'al1.png', bgColor: '#222222' }];

export const genres = [
    { _id: 'g1', name: 'Pop', bgColor: '#000000', songCount: 2 },
    { _id: 'g2', name: 'Rock', bgColor: '#000000', songCount: 2 },
];

export const songs = [
    {
        _id: 's1', name: 'Alpha', artist: [artistRef('a1', 'Keshi')], artistName: 'Keshi',
        album: 'Skeletons', albumId: 'al1', genres: [{ _id: 'g1', name: 'Pop' }],
        image: 's1.png', file: 'https://cdn.test/s1.mp3', duration: '3:05', lrcFile: '',
    },
    {
        _id: 's2', name: 'Beta', artist: [artistRef('a1', 'Keshi')], artistName: 'Keshi',
        album: 'none', albumId: null, genres: [{ _id: 'g1', name: 'Pop' }, { _id: 'g2', name: 'Rock' }],
        image: 's2.png', file: 'https://cdn.test/s2.mp3', duration: '2:00', lrcFile: 'https://cdn.test/s2.lrc',
    },
    {
        _id: 's3', name: 'Gamma', artist: [artistRef('a2', 'Other Artist')], artistName: 'Other Artist',
        album: 'none', albumId: null, genres: [{ _id: 'g2', name: 'Rock' }],
        image: 's3.png', file: 'https://cdn.test/s3.mp3', duration: '1:30', lrcFile: '',
    },
];

export const playlist = (overrides = {}) => ({
    _id: 'p1', name: 'My Mix', description: 'Road trip', image: 'p1.png', isPublic: true,
    creator: { _id: 'u1', fullName: 'Test User', clerkId: 'user_1' },
    songs: [songs[0], songs[2]], songCount: 2,
    ...overrides,
});
