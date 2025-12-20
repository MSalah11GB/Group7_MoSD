import { v2 as cloudinary } from "cloudinary";
import songModel from "../models/songModel.js";
import artistModel from "../models/artistModel.js";
import albumModel from "../models/albumModel.js";
import genreModel from "../models/genreModel.js";
import { convertToArray, handleNewGenres, getArtistNames } from "../utils/songUtils.js";
import { uploadAudioFile, uploadImageFile, uploadLrcFile } from "../utils/uploadUtils.js";
import { executeTransaction } from "../utils/transactionUtils.js";
import {
  extractSpotifyTrackId,
  getSpotifyTrackInfo,
  findAndDownloadYoutubeAudio,
  findYouTubeId,
} from "../utils/streamingUtils.js";

const addSong = async (req, res) => {
  try {
    let songData = {};
    let audioFile;
    let tempFilePath = null; // Add tempFilePath to outer scope

    // Handle Spotify URL
    if (req.body.spotifyUrl) {
      const trackId = extractSpotifyTrackId(req.body.spotifyUrl);
      if (!trackId) {
        return res.json({ success: false, message: "Invalid Spotify URL" });
      }

      try {
        const trackInfo = await getSpotifyTrackInfo(trackId);
        const album = req.body.album || "none"; // Get album from request or default to 'none'

        // Find or create artists
        const artistPromises = trackInfo.artists.map(async (artistData) => {
          console.log(`Processing artist:`, artistData);
          let artist = await artistModel.findOne({
            name: { $regex: new RegExp(`^${artistData.name}$`, "i") },
          });
          if (!artist) {
            console.log(`Creating new artist with data:`, {
              name: artistData.name,
              image: artistData.image,
              bgColor: artistData.bgColor,
            });
            artist = await artistModel.create({
              name: artistData.name,
              image: artistData.image || "https://placeholder.com/artist",
              bgColor: artistData.bgColor || "#e0e0e0",
            });
          }
          return artist._id;
        });

        const artistIds = await Promise.all(artistPromises);
        const { artistName } = await getArtistNames(artistIds);

        // Download audio from YouTube
        // Format search query
        const searchQuery = `${trackInfo.name} ${trackInfo.artists[0].name}`;
        console.log("Using search query:", searchQuery);

        const downloadResult = await findAndDownloadYoutubeAudio(searchQuery);
        tempFilePath = downloadResult.path; // Store in outer scope variable
        const duration = downloadResult.duration;
        audioFile = {
          path: tempFilePath,
          mimetype: "audio/mpeg",
        };

        // Process genres (if provided)
        let genres = convertToArray(req.body.genres);
        const newGenres = await handleNewGenres(req.body.newGenres);
        genres = [...new Set([...genres, ...newGenres])];

        // Create song data
        songData = {
          name: trackInfo.name,
          artist: artistIds,
          artistName,
          album, // Use album from form data
          image: trackInfo.image,
          duration,
          genres,
        };

        // Upload the audio file
        const { fileUrl: audioUrl } = await uploadAudioFile(audioFile);
        songData.file = audioUrl;

        // Cleanup will happen after fingerprint generation
      } catch (error) {
        console.error("Error processing Spotify track:", error);
        // Clean up temp file on error
        if (tempFilePath) {
          try {
            await fs.unlink(tempFilePath);
          } catch (cleanupError) {
            console.error("Error cleaning up temp file:", cleanupError);
          }
        }
        return res.json({ success: false, message: "Error processing Spotify track" });
      }
    } else {
      // Handle regular upload
      const name = req.body.name;
      const artistIds = convertToArray(req.body.artists) || convertToArray(req.body.artist);
      const album = req.body.album;

      // Process genres
      let genres = convertToArray(req.body.genres);
      const newGenres = await handleNewGenres(req.body.newGenres);
      genres = [...new Set([...genres, ...newGenres])];

      // Upload files
      if (!req.files?.audio?.[0]) {
        return res.json({ success: false, message: "Audio file is required" });
      }
      audioFile = req.files.audio[0];
      const { fileUrl: audioUrl, duration } = await uploadAudioFile(audioFile);

      // Handle image upload for YouTube URL option (only when not using Spotify URL)
      let imageUrl = "";
      if (!req.body.spotifyUrl) {
        // Only handle image if not using Spotify URL
        if (req.body.useAlbumImage === "true" && req.body.albumId) {
          const albumData = await albumModel.findById(req.body.albumId);
          if (albumData?.image) {
            imageUrl = albumData.image;
          } else {
            return res.json({ success: false, message: "Album image not found" });
          }
        } else if (req.files.image?.[0]) {
          imageUrl = await uploadImageFile(req.files.image[0]);
        } else {
          return res.json({ success: false, message: "Image is required for YouTube URL" });
        }
      }

      // Get artist names
      const { artistName } = await getArtistNames(artistIds);

      songData = {
        name,
        artist: artistIds,
        artistName,
        album,
        image: req.body.spotifyUrl ? songData.image : imageUrl, // Use Spotify image or uploaded image
        file: audioUrl,
        duration,
        lrcFile: null, // Will be set after if/else block if LRC file exists
        genres,
      };
    }

    // Handle LRC file upload - moved outside of if/else for Spotify URL
    if (req.files?.lrc?.[0]) {
      const lrcFileUrl = await uploadLrcFile(req.files.lrc[0]);
      if (lrcFileUrl) {
        songData.lrcFile = lrcFileUrl;
        console.log("LRC file uploaded successfully:", lrcFileUrl);
      }
    }

    const song = new songModel(songData);
    await song.save();

    // Update genres
    if (songData.genres?.length > 0) {
      await genreModel.updateMany(
        { _id: { $in: songData.genres } },
        {
          $push: { songList: song._id },
          $inc: { songCount: 1 },
        }
      );
    }

    res.json({ success: true, message: "Song Added" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const listSong = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { album: { $regex: search, $options: "i" } },
          { artistName: { $regex: search, $options: "i" } },
        ],
      };
    }

    const allSongs = await songModel
      .find(query)
      .populate("artist", "name image")
      .populate("genres", "name")
      .sort({ _id: -1 });

    res.json({ success: true, songs: allSongs });
  } catch (error) {
    console.error("Error listing songs:", error);
    res.json({ success: false, message: error.message });
  }
};

const removeSong = async (req, res) => {
  try {
    const songId = req.body.id;

    const song = await songModel.findById(songId);
    if (!song) {
      return res.json({ success: false, message: "Song not found" });
    }

    // Remove song from genres
    if (song.genres && song.genres.length > 0) {
      await genreModel.updateMany(
        { _id: { $in: song.genres } },
        {
          $pull: { songList: songId },
          $inc: { songCount: -1 },
        }
      );
    }

    // Delete song from database
    await songModel.findByIdAndDelete(songId);

    res.json({ success: true, message: "Song removed successfully" });
  } catch (error) {
    console.error("Error in removeSong:", error);
    res.json({ success: false, message: error.message });
  }
};

const updateSong = async (req, res) => {
  try {
    const { id } = req.body;
    const name = req.body.name;
    const artistIds = convertToArray(req.body.artists) || convertToArray(req.body.artist);
    const album = req.body.album;

    // Process genres
    let genres = convertToArray(req.body.genres);
    const newGenres = await handleNewGenres(req.body.newGenres);
    genres = [...new Set([...genres, ...newGenres])];

    // Get artist names
    const { artistName } = await getArtistNames(artistIds);

    const updateData = {
      name,
      artist: artistIds,
      artistName,
      album,
      genres,
    };

    // Handle YouTube URL if provided
    if (req.body.youtubeUrl && ytdl.validateURL(req.body.youtubeUrl)) {
      const videoId = ytdl.getURLVideoID(req.body.youtubeUrl);
      updateData.youtubeId = videoId;
      updateData.youtubeUrl = req.body.youtubeUrl;
    }

    // Handle file updates
    if (req.body.useAlbumImage === "true" && req.body.albumId) {
      const albumData = await albumModel.findById(req.body.albumId);
      if (albumData?.image) {
        updateData.image = albumData.image;
      } else {
        return res.json({ success: false, message: "Album image not found" });
      }
    } else if (req.files) {
      if (req.files.image?.[0]) {
        updateData.image = await uploadImageFile(req.files.image[0]);
      }
      if (req.files.audio?.[0]) {
        // Store audio file reference for fingerprint generation
        const audioFile = req.files.audio[0];
        const { fileUrl, duration } = await uploadAudioFile(audioFile);
        updateData.file = fileUrl;
        updateData.duration = duration;
      }
      if (req.files.lrc?.[0]) {
        updateData.lrcFile = await uploadLrcFile(req.files.lrc[0]);
      }
    }

    const currentSong = await songModel.findById(id);
    if (!currentSong) {
      return res.json({ success: false, message: "Song not found" });
    }

    const oldGenres = currentSong.genres.map((g) => g.toString());
    const oldArtistIds = Array.isArray(currentSong.artist)
      ? currentSong.artist.map((a) => a.toString())
      : [];

    await executeTransaction(async (session) => {
      await songModel.findByIdAndUpdate(id, updateData, { session });

      // Handle genre updates
      const removedGenres = oldGenres.filter((g) => !genres.includes(g));
      const addedGenres = genres.filter((g) => !oldGenres.includes(g));

      if (removedGenres.length > 0) {
        await Promise.all(
          removedGenres.map((genreId) =>
            genreModel.findByIdAndUpdate(
              genreId,
              {
                $pull: { songList: id },
                $inc: { songCount: -1 },
              },
              { session, new: true }
            )
          )
        );
      }

      if (addedGenres.length > 0) {
        await Promise.all(
          addedGenres.map((genreId) =>
            genreModel.findByIdAndUpdate(
              genreId,
              {
                $addToSet: { songList: id },
                $inc: { songCount: 1 },
              },
              { session, new: true }
            )
          )
        );
      }

      // Handle artist updates
      const removedArtists = oldArtistIds.filter((a) => !artistIds.includes(a));
      const addedArtists = artistIds.filter((a) => !oldArtistIds.includes(a));

      for (const artistId of removedArtists) {
        const artistSongs = await songModel
          .find({
            artist: artistId,
            _id: { $ne: id },
          })
          .session(session);

        const remainingGenres = new Set();
        artistSongs.forEach((song) => {
          if (song.genres?.length > 0) {
            song.genres.forEach((genreId) => {
              remainingGenres.add(genreId.toString());
            });
          }
        });

        await artistModel.findByIdAndUpdate(
          artistId,
          { genres: Array.from(remainingGenres) },
          { session, new: true }
        );
      }

      for (const artistId of addedArtists) {
        const artist = await artistModel.findById(artistId).session(session);
        if (artist) {
          const uniqueGenres = new Set([
            ...(artist.genres || []).map((g) => g.toString()),
            ...genres,
          ]);

          await artistModel.findByIdAndUpdate(
            artistId,
            { genres: Array.from(uniqueGenres) },
            { session, new: true }
          );
        }
      }
    });

    res.json({ success: true, message: "Song updated" });
  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload song - basic version
const uploadSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "songs/audio",
    });

    const song = new songModel({
      name: req.body.title || "Untitled",
      artist: req.body.artist ? [req.body.artist] : [],
      artistName: req.body.artist || "",
      album: req.body.album || "Unknown",
      image: req.body.image || "https://placeholder.com/image",
      file: cloudinaryResult.secure_url,
      duration: req.body.duration || "0:00",
      youtubeId: req.body.youtubeId || "",
    });

    await song.save();
    res.status(201).json(song);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading song" });
  }
};

// Download song info from YouTube URL
const downloadSong = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({
        success: false,
        message: "YouTube URL is required",
      });
    }

    if (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be")) {
      return res.status(400).json({
        success: false,
        message: "Invalid YouTube URL format",
      });
    }

    let videoId = "";
    if (youtubeUrl.includes("youtube.com/watch?v=")) {
      videoId = new URL(youtubeUrl).searchParams.get("v");
    } else if (youtubeUrl.includes("youtu.be/")) {
      videoId = youtubeUrl.split("youtu.be/")[1].split("?")[0];
    } else if (youtubeUrl.includes("youtube.com/embed/")) {
      videoId = youtubeUrl.split("youtube.com/embed/")[1].split("?")[0];
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Could not extract video ID from URL",
      });
    }

    return res.status(200).json({
      success: true,
      videoId: videoId,
      title: "Sample Title",
      artist: "Sample Artist",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      duration: "180",
    });
  } catch (error) {
    console.error("YouTube download error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing YouTube URL",
      error: error.message || "Unknown error",
    });
  }
};

export { addSong, listSong, removeSong, updateSong, uploadSong, downloadSong };
