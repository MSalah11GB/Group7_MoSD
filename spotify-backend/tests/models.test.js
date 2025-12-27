import mongoose from 'mongoose';

import { jest } from '@jest/globals';

import { User } from '../src/models/userModel.js';
import Song from '../src/models/songModel.js';
import Artist from '../src/models/artistModel.js';
import Album from '../src/models/albumModel.js';
import Genre from '../src/models/genreModel.js';
import Playlist from '../src/models/playlistModel.js';

describe('Database Model Relationships', () => {
    let mongoAvailable = true;

    jest.setTimeout(30000);

    beforeAll(async () => {
        const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/musicify_test';
        try {
            await mongoose.connect(url, {
                serverSelectionTimeoutMS: 2000,
            });
        } catch (err) {
            mongoAvailable = false;
        }
    });

    afterEach(async () => {
        if (!mongoAvailable) return;
        await Promise.all([
            User.deleteMany(),
            Song.deleteMany(),
            Artist.deleteMany(),
            Album.deleteMany(),
            Genre.deleteMany(),
            Playlist.deleteMany()
        ]);
    });

    afterAll(async () => {
        if (!mongoAvailable) return;
        await mongoose.connection.close();
    });

    it('should create a complete chain: Genre -> Artist -> Album -> Song -> User -> Playlist', async () => {
        if (!mongoAvailable) return;
        const uniqueGenreName = `Pop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const genre = await Genre.create({
            name: uniqueGenreName,
            songCount: 0
        });

        const album = await Album.create({
            name: 'Thriller',
            desc: 'The best selling album',
            bgColor: '#000000',
            image: 'album_cover_url'
        });

        const artist = await Artist.create({
            name: 'Michael Jackson',
            bgColor: '#ffffff',
            image: 'mj_image_url',
            genres: [genre._id]
        });

        const song = await Song.create({
            name: 'Billie Jean',
            artist: [artist._id],
            album: album.name,
            image: 'song_image_url',
            file: 'song_audio_url',
            duration: '4:54',
            genres: [genre._id]
        });

        const user = await User.create({
            fullName: 'Test Admin',
            imageURL: 'http://example.com/avatar.jpg',
            clerkId: 'clerk_12345'
        });

        const playlist = await Playlist.create({
            name: 'My Favorites',
            image: 'playlist_cover_url',
            creator: user._id,
            songs: [song._id],
            description: 'Best hits'
        });

        expect(playlist).toBeDefined();
        expect(playlist.creator.toString()).toBe(user._id.toString());
        expect(playlist.songs[0].toString()).toBe(song._id.toString());

        const savedSong = await Song.findById(song._id);
        expect(savedSong.artist[0].toString()).toBe(artist._id.toString());

        expect(user.createdAt).toBeDefined();
    });

    it('should fail validation if required fields are missing', async () => {
        if (!mongoAvailable) return;
        let err;
        try {
            await User.create({ fullName: 'Ghost' });
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.clerkId).toBeDefined();
    });
});
