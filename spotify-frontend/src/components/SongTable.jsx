import { assets } from '../assets/assets';

/**
 * The song list used by the album, artist and genre pages.
 * `compact` renders the title on one line; otherwise the artist name sits under the title.
 */
const SongTable = ({ songs, albumLabel, fallbackArtist = '', onPlay, compact = false, headerClassName = 'mb-4' }) => (
    <>
        <div className={`grid grid-cols-3 sm:grid-cols-4 pl-2 text-[#a7a7a7] ${headerClassName}`}>
            <p><b className='mr-4'>#</b>Title</p>
            <p>Album</p>
            <p className='hidden sm:block'>Date Added</p>
            <img className='m-auto w-4' src={assets.clock_icon} alt="" />
        </div>
        <hr />
        {songs.map((song, index) => (
            <div
                key={song._id}
                onClick={() => onPlay(song._id)}
                className='grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] cursor-pointer'
            >
                {compact ? (
                    <p className='text-white'>
                        <b className='mr-4 text-[#a7a7a7]'>{index + 1}</b>
                        <img className='inline w-10 mr-5' src={song.image} alt="" />
                        {song.name}
                    </p>
                ) : (
                    <p className='text-white flex items-center'>
                        <b className='mr-4 text-[#a7a7a7]'>{index + 1}</b>
                        <img className='w-10 mr-5' src={song.image} alt="" />
                        <span className='flex flex-col'>
                            <span>{song.name}</span>
                            <span className='text-sm text-[#a7a7a7]'>{song.artistName || fallbackArtist}</span>
                        </span>
                    </p>
                )}
                <p className='text-[15px]'>{albumLabel(song)}</p>
                <p className='text-[15px] hidden sm:block'>5 days ago</p>
                <p className='text-[15px] text-center'>{song.duration}</p>
            </div>
        ))}
    </>
);

export default SongTable;
