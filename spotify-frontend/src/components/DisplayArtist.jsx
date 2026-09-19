import { useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from './Navbar';
import SongTable from './SongTable';
import StatusMessage from './StatusMessage';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/assets';
import { formatTotalDuration, songsForArtist, splitByAlbum } from '../lib/catalog';

const DisplayArtist = () => {
  const { id } = useParams();
  const { playWithId, songsData, albumsData, artistsData } = useContext(PlayerContext);

  const artist = artistsData.find((item) => item._id === id);
  const artistSongs = useMemo(() => songsForArtist(songsData, id), [songsData, id]);
  const { byAlbum, singles } = useMemo(() => splitByAlbum(artistSongs), [artistSongs]);

  if (!artist) return <StatusMessage title='Artist not found'>They may have been removed.</StatusMessage>;

  return (
    <>
      <Navbar showNavigation={false} />
      <div className='px-6 py-8 mb-8'>
        <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
          <div className='w-48 h-48 rounded-full overflow-hidden'>
            <img className='w-full h-full object-cover' src={artist.image} alt={artist.name} />
          </div>
          <div className='flex flex-col'>
            <p>Artist</p>
            <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{artist.name}</h2>
            <p className='mt-1'>
              <img className='inline-block w-5' src={assets.spotify_logo} alt="" />
              <b>Spotify</b>
              • {artistSongs.length} songs
              • {formatTotalDuration(artistSongs)}
            </p>
          </div>
        </div>
      </div>

      <div className='px-6'>
        {artistSongs.length === 0 && (
          <div className='mt-10 text-center'>
            <h3 className='text-2xl font-bold mb-4'>No songs found</h3>
            <p className='text-gray-400'>This artist doesn't have any songs in the library yet.</p>
          </div>
        )}

        {singles.length > 0 && (
          <div className='mt-10'>
            <h3 className='text-2xl font-bold mb-4'>Singles</h3>
            <SongTable songs={singles} albumLabel={() => 'Single'} fallbackArtist={artist.name} onPlay={playWithId} />
          </div>
        )}

        {Object.entries(byAlbum).map(([albumName, albumSongs]) => {
          const album = albumsData.find((a) => a.name === albumName);

          return (
            <div className='mt-10' key={albumName}>
              <div className='flex items-center gap-4 mb-4'>
                {album && <img className='w-16 h-16 rounded' src={album.image} alt={albumName} />}
                <h3 className='text-2xl font-bold'>{albumName}</h3>
              </div>
              <SongTable songs={albumSongs} albumLabel={() => albumName} fallbackArtist={artist.name} onPlay={playWithId} />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DisplayArtist;
