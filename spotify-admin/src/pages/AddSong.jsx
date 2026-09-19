import { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import axios from 'axios';
import { url } from '../config/api';
import { toast } from 'react-toastify';
import { isDuplicateGenre } from '../utils/genreUtils';
import { FaSpotify } from 'react-icons/fa';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { useCatalogList } from '../hooks/useCatalog';
import { errorMessage } from '../utils/errors';

const AddSong = () => {
  const [song, setSong] = useState(false);
  const [image, setImage] = useState(false);
  const [useAlbumImage, setUseAlbumImage] = useState(
    localStorage.getItem('addSong_useAlbumImage') === 'true'
  );
  const [lrcFile, setLrcFile] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState(localStorage.getItem('addSong_spotifyUrl') || "");
  const [name, setName] = useState(localStorage.getItem('addSong_name') || "");
  const [selectedArtists, setSelectedArtists] = useState(
    JSON.parse(localStorage.getItem('addSong_selectedArtists') || '[]')
  );
  const [albumChoice, setAlbum] = useState(localStorage.getItem('addSong_album') || "none");
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState(
    JSON.parse(localStorage.getItem('addSong_selectedGenres') || '[]')
  );
  const [newGenre, setNewGenre] = useState("");
  const [newGenres, setNewGenres] = useState(
    JSON.parse(localStorage.getItem('addSong_newGenres') || '[]')
  );
  const [spotifyImage, setSpotifyImage] = useState("");
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [status, setStatus] = useState("");

  const { data: albumData } = useCatalogList('album');
  const { data: artistData } = useCatalogList('artist');
  const { data: genreData } = useCatalogList('genre');

  // A remembered choice may be an album that no longer exists (or, from older versions, a name).
  const album = albumChoice === "none" || albumData.some((a) => a._id === albumChoice) ? albumChoice : "none";

  useEffect(() => {
    localStorage.setItem('addSong_name', name);
    localStorage.setItem('addSong_selectedArtists', JSON.stringify(selectedArtists));
    localStorage.setItem('addSong_album', albumChoice);
    localStorage.setItem('addSong_selectedGenres', JSON.stringify(selectedGenres));
    localStorage.setItem('addSong_newGenres', JSON.stringify(newGenres));
    localStorage.setItem('addSong_useAlbumImage', useAlbumImage.toString());
    localStorage.setItem('addSong_spotifyUrl', spotifyUrl);
  }, [name, selectedArtists, albumChoice, selectedGenres, newGenres, useAlbumImage, spotifyUrl]);

  const clearStoredFormData = () => {
    localStorage.removeItem('addSong_name');
    localStorage.removeItem('addSong_selectedArtists');
    localStorage.removeItem('addSong_album');
    localStorage.removeItem('addSong_selectedGenres');
    localStorage.removeItem('addSong_newGenres');
    localStorage.removeItem('addSong_spotifyUrl');
  };

  const fetchFromSpotify = async () => {
    setFetchingMetadata(true);
    try {
      const response = await axios.post(`${url}/api/song/spotify-metadata`, { spotifyUrl: spotifyUrl.trim() });
      const track = response.data.track;
      if (!response.data.success || !track) {
        toast.error(response.data.message || "Could not fetch Spotify details");
        return;
      }

      setName(track.name);
      if (track.image) setSpotifyImage(track.image);

      const matched = [];
      const missing = [];
      track.artists.forEach((spotifyArtist) => {
        const existing = artistData.find(
          (a) => a.name.trim().toLowerCase() === spotifyArtist.name.trim().toLowerCase()
        );
        if (existing) matched.push(existing._id);
        else missing.push(spotifyArtist.name);
      });
      setSelectedArtists((current) => [...new Set([...current, ...matched])]);

      toast.success("Spotify details filled in");
      if (missing.length > 0) {
        toast.warning(`Add these artists first (Add Artist), then fetch again: ${missing.join(', ')}`);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setFetchingMetadata(false);
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!song) {
      toast.error("Please upload an audio file");
      return;
    }

    if (selectedArtists.length === 0) {
      toast.error("Please select at least one artist");
      return;
    }

    const usingAlbumImage = useAlbumImage && album !== "none";
    if (!image && !usingAlbumImage && !spotifyImage) {
      toast.error("Please upload an image, use the album image, or fetch the cover from Spotify");
      return;
    }

    setLoading(true);
    try {
      // Files go straight to Cloudinary; the API only receives the ids and verifies them.
      setStatus("Uploading audio...");
      const audioPublicId = await uploadToCloudinary(song, 'audio');

      let imagePublicId;
      if (image && !usingAlbumImage) {
        setStatus("Uploading image...");
        imagePublicId = await uploadToCloudinary(image, 'image');
      }

      let lrcPublicId;
      if (lrcFile) {
        setStatus("Uploading lyrics...");
        lrcPublicId = await uploadToCloudinary(lrcFile, 'lrc');
      }

      setStatus("Saving song...");
      const formData = new FormData();
      formData.append('name', name);
      selectedArtists.forEach((artistId) => formData.append('artists', artistId));
      formData.append('albumId', album);
      formData.append('audioPublicId', audioPublicId);

      if (usingAlbumImage) formData.append('useAlbumImage', 'true');
      else if (imagePublicId) formData.append('imagePublicId', imagePublicId);
      else formData.append('imageUrl', spotifyImage);

      if (lrcPublicId) formData.append('lrcPublicId', lrcPublicId);
      selectedGenres.forEach((genreId) => formData.append('genres', genreId));
      newGenres.forEach((genre) => formData.append('newGenres', genre));

      const response = await axios.post(`${url}/api/song/add`, formData);

      if (response.data.success) {
        toast.success("Song Added");
        setName("");
        setSelectedArtists([]);
        setAlbum("none");
        setImage(false);
        setSong(false);
        setLrcFile(false);
        setUseAlbumImage(false);
        setSelectedGenres([]);
        setNewGenres([]);
        setNewGenre("");
        setSpotifyUrl("");
        setSpotifyImage("");
        clearStoredFormData();
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      toast.error(errorMessage(error));
    }
    setStatus("");
    setLoading(false);
  }

  // Handle artist selection
  const handleArtistSelect = (e) => {
    const artistId = e.target.value;
    if (artistId && !selectedArtists.includes(artistId)) {
      setSelectedArtists([...selectedArtists, artistId]);
    }
  }

  // Remove a selected artist
  const removeArtist = (artistId) => {
    setSelectedArtists(selectedArtists.filter(id => id !== artistId));
  }

  // Get artist name by ID
  const getArtistName = (artistId) => {
    const artist = artistData.find(a => a._id === artistId);
    return artist ? artist.name : "";
  }

  // Handle genre selection
  const handleGenreSelect = (e) => {
    const genreId = e.target.value;
    if (genreId && !selectedGenres.includes(genreId)) {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  }

  // Remove a selected genre
  const removeGenre = (genreId) => {
    setSelectedGenres(selectedGenres.filter(id => id !== genreId));
  }

  // Add a new genre with validation
  const addNewGenre = () => {
    const trimmedGenre = newGenre.trim();

    if (!trimmedGenre) {
      return; // Don't add empty genres
    }

    // Check for duplicates using our utility function
    const duplicateCheck = isDuplicateGenre(trimmedGenre, genreData, newGenres);

    if (duplicateCheck.isDuplicate) {
      // Show appropriate error message based on where the duplicate was found
      if (duplicateCheck.isExisting) {
        toast.error(`Genre "${duplicateCheck.duplicateName}" already exists in the system`);
      } else {
        toast.error(`You've already added "${duplicateCheck.duplicateName}" to the new genres list`);
      }
      return;
    }

    // No duplicates found, add the new genre
    setNewGenres([...newGenres, trimmedGenre]);
    setNewGenre("");
  }

  // Remove a new genre
  const removeNewGenre = (genre) => {
    setNewGenres(newGenres.filter(g => g !== genre));
  }

  // Get genre name by ID
  const getGenreName = (genreId) => {
    const genre = genreData.find(g => g._id === genreId);
    return genre ? genre.name : "";
  }

  return loading ? (
    <div className='grid place-items-center min-h-[80vh]'>
      <div className='flex flex-col items-center gap-4'>
        <div className='w-16 h-16 border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'></div>
        <p className='text-gray-600'>{status}</p>
      </div>
    </div>
  ) : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600' action="">
      <div className='flex gap-8'>
        <div className='flex flex-col gap-4'>
          <p>Upload song</p>
          <input onChange={(e) => setSong(e.target.files[0])} type="file" id='song' accept='audio/*' hidden/>
          <label htmlFor="song">
            <img src={song ? assets.upload_added : assets.upload_song} className='w-24 cursor-pointer' alt="" />
          </label>
        </div>
        <div className='flex flex-col gap-4'>
          <p>Upload Image</p>
          <input
            onChange={(e) => setImage(e.target.files[0])}
            type="file"
            id='image'
            accept='image/*'
            hidden
            disabled={useAlbumImage}
          />
          <label htmlFor="image" className={useAlbumImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}>
            <img
              src={image instanceof File ? URL.createObjectURL(image) : (spotifyImage || assets.upload_area)}
              className='w-24'
              alt=""
            />
            {useAlbumImage && album !== "none" && (
              <div className="text-xs text-green-600 mt-1 text-center">Using album image</div>
            )}
            {!image && spotifyImage && !useAlbumImage && (
              <div className="text-xs text-green-600 mt-1 text-center">Using Spotify cover</div>
            )}
          </label>
        </div>

        <div className='flex flex-col gap-4'>
          <p>Upload Lyrics (LRC)</p>
          <input onChange={(e) => setLrcFile(e.target.files[0])} type="file" id='lrc' accept='.lrc' hidden/>
          <label htmlFor="lrc">
            <div className={`w-24 h-24 flex items-center justify-center border-2 ${lrcFile ? 'border-green-600 bg-green-100' : 'border-gray-300'} rounded cursor-pointer`}>
              <span className={`text-sm ${lrcFile ? 'text-green-600' : 'text-gray-500'}`}>
                {lrcFile ? 'LRC Added' : 'LRC File'}
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className='flex flex-col gap-2.5 w-full'>
        <p>Fill in details from Spotify (optional)</p>
        <div className='flex gap-2'>
          <div className='flex items-center border-2 border-gray-400 focus-within:border-green-600 flex-grow'>
            <span className='px-2 text-green-600'><FaSpotify size={24} /></span>
            <input
              onChange={(e) => setSpotifyUrl(e.target.value)}
              value={spotifyUrl}
              className='bg-transparent outline-none p-2.5 flex-grow'
              placeholder='https://open.spotify.com/track/...'
              type="text"
              disabled={fetchingMetadata}
            />
          </div>
          <button
            type='button'
            onClick={fetchFromSpotify}
            disabled={!spotifyUrl.trim() || fetchingMetadata}
            className='bg-green-600 text-white px-4 disabled:opacity-50'
          >
            {fetchingMetadata ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
        <p className='text-xs text-gray-500'>
          Fills in the song name, matching artists and the cover image. The audio file is always uploaded by you.
        </p>
      </div>

      <div className='flex flex-col gap-2.5'>
        <p>Song name</p>
        <input onChange={(e) => setName(e.target.value)} value={name} className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250vw)]' placeholder='Type Here' type="text" required/>
      </div>
      <div className='flex flex-col gap-2.5'>
        <p>Artists</p>
        <div className='flex flex-wrap gap-2 mb-2'>
          {selectedArtists.map((artistId) => (
            <div key={artistId} className='bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1'>
              <span>{getArtistName(artistId)}</span>
              <button
                type="button"
                onClick={() => removeArtist(artistId)}
                className='text-red-500 font-bold'
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <select
          onChange={handleArtistSelect}
          value=""
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]'
        >
          <option value="">Select Artist</option>
          {artistData.map((item, index) => (
            <option
              key={index}
              value={item._id}
              disabled={selectedArtists.includes(item._id)}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className='flex flex-col gap-2.5'>
        <p>Album</p>
        <select
          onChange={(e) => {
            setAlbum(e.target.value);
            // If "none" is selected, disable useAlbumImage
            if (e.target.value === "none") {
              setUseAlbumImage(false);
            }
          }}
          value={album}
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[150px]'
        >
          <option value="none">None</option>
          {albumData.map((item, index) => (<option key={index} value={item._id}>{item.name}</option>))}
        </select>

        {album !== "none" && (
          <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="useAlbumImage"
              checked={useAlbumImage}
              onChange={(e) => {
                  setUseAlbumImage(e.target.checked);
                  if (e.target.checked) setImage(false);
                }}
              className="mr-2"
            />
            <label htmlFor="useAlbumImage" className="text-sm cursor-pointer">
              Use album image for this song
            </label>
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2.5'>
        <p>Genres</p>
        <div className='flex flex-wrap gap-2 mb-2'>
          {selectedGenres.map((genreId) => (
            <div key={genreId} className='bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1'>
              <span>{getGenreName(genreId)}</span>
              <button
                type="button"
                onClick={() => removeGenre(genreId)}
                className='text-red-500 font-bold'
              >
                ×
              </button>
            </div>
          ))}
          {newGenres.map((genre) => (
            <div key={genre} className='bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1'>
              <span>{genre} (new)</span>
              <button
                type="button"
                onClick={() => removeNewGenre(genre)}
                className='text-red-500 font-bold'
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <select
          onChange={handleGenreSelect}
          value=""
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)] mb-2'
        >
          <option value="">Select Genre</option>
          {genreData.map((item) => (
            <option
              key={item._id}
              value={item._id}
              disabled={selectedGenres.includes(item._id)}
            >
              {item.name}
            </option>
          ))}
        </select>

        <div className='flex gap-2 items-center'>
          <input
            type="text"
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            placeholder="Add new genre"
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 flex-grow'
          />
          <button
            type="button"
            onClick={addNewGenre}
            className='bg-green-600 text-white px-4 py-2.5'
            disabled={!newGenre.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <button type="submit" className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>ADD</button>
    </form>
  )
}

export default AddSong