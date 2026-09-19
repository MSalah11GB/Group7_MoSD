import { useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import SongTable from './SongTable';
import StatusMessage from './StatusMessage';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/assets';
import { formatTotalDuration, groupByFirstArtist, songsForGenre } from '../lib/catalog';

const DisplayGenre = () => {
    const { genreId } = useParams();
    const { playWithId, songsData, genresData, artistsData } = useContext(PlayerContext);

    const genre = genresData.find((item) => item._id === genreId);
    const genreSongs = useMemo(() => songsForGenre(songsData, genreId), [songsData, genreId]);
    const songsByArtist = useMemo(() => groupByFirstArtist(genreSongs), [genreSongs]);

    if (!genre) return <StatusMessage title='Genre not found'>It may have been removed.</StatusMessage>;

    return (
      <>
        <div className='px-6'>
          <div className='mt-10'>
            <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{genre.name}</h2>
            <p className='mt-1'>
              <img className='inline-block w-5' src={assets.musicify_logo} alt="" />
              <b>Musicify</b>
              • {genreSongs.length} songs
              • {formatTotalDuration(genreSongs)}
            </p>
          </div>
        </div>

        <div className='px-6'>
          {genreSongs.length === 0 && (
            <div className='mt-10 text-center'>
              <h3 className='text-2xl font-bold mb-4'>No songs found</h3>
              <p className='text-gray-400'>There are no songs in this genre yet.</p>
            </div>
          )}

          {Object.entries(songsByArtist).map(([artistId, artistSongs]) => {
            const artist = artistsData.find((a) => a._id === artistId);
            const artistName = artist ? artist.name : 'Unknown Artist';

            return (
              <div className='mt-10' key={artistId}>
                <div className='flex items-center gap-4 mb-4'>
                  {artist && <img className='w-16 h-16 rounded-full object-cover' src={artist.image} alt={artistName} />}
                  <h3 className='text-2xl font-bold'>{artistName}</h3>
                </div>
                <SongTable
                  songs={artistSongs}
                  albumLabel={(song) => song.album}
                  fallbackArtist={artistName}
                  onPlay={playWithId}
                />
              </div>
            );
          })}
        </div>
      </>
    );
};

export default DisplayGenre;
