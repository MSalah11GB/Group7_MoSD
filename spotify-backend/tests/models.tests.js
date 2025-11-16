import mongoose from 'mongoose';
import { User } from 'src/models/userModel.js'; 
import Song from 'src/models/songModel.js';
import Artist from 'src/models/artistModel.js';
import Album from 'src/models/albumModel.js';
import Genre from 'src/models/genreModel.js';
import Playlist from 'src/models/playlistModel.js';

describe('Database Model Relationships', () => {
    beforeAll(async () => {
        const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/musicify_test';
        await mongoose.connect(url);
    });

    // 2. Clean up data after each test to prevent duplicates
    afterEach(async () => {
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
        await mongoose.connection.close();
    });

    it('should create a complete chain: Genre -> Artist -> Album -> Song -> User -> Playlist', async () => {
        
        // Step A: Create Dependencies (Genre & Album) ---
        const genre = await Genre.create({ 
            name: "Pop", 
            songCount: 0 
        });
        
        const album = await Album.create({
            name: "Thriller",
            desc: "The best selling album",
            bgColor: "#000000",
            image: "album_cover_url"
        });

        // Step B: Create Artist (Links to Genre) ---
        const artist = await Artist.create({
            name: "Michael Jackson",
            bgColor: "#ffffff",
            image: "mj_image_url",
            genres: [genre._id] // Link to the Genre created above
        });

        // Step C: Create Song (Links to Artist & Genre) ---
        const song = await Song.create({
            name: "Billie Jean",
            artist: [artist._id], 
            album: album.name, 
            image: "song_image_url",
            file: "song_audio_url",
            duration: "4:54",
            genres: [genre._id]
        });

        // Step D: Create User (Required for Playlist) ---
        const user = await User.create({
            fullName: "Test Admin",
            imageURL: "http://example.com/avatar.jpg",
            clerkId: "clerk_12345"
        });

        // Step E: Create Playlist (Links to User & Song) ---
        const playlist = await Playlist.create({
            name: "My Favorites",
            image: "playlist_cover_url",
            creator: user._id,    
            songs: [song._id],    
            desc: "Best hits"
        });

        // ASSERTIONS: Verify the data is saved and linked correctly ---
        
        expect(playlist).toBeDefined();
        expect(playlist.creator.toString()).toBe(user._id.toString());
        expect(playlist.songs[0].toString()).toBe(song._id.toString());
        
        // Check if the song correctly stored the artist ID
        const savedSong = await Song.findById(song._id);
        expect(savedSong.artist[0].toString()).toBe(artist._id.toString());
        
        // Check timestamps (User schema has timestamps: true)
        expect(user.createdAt).toBeDefined();
    });

    it('should fail validation if required fields are missing', async () => {
        let err;
        try {
            await User.create({ fullName: "Ghost" });
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.clerkId).toBeDefined();
    });
});