import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';

const PlaylistItem = ({ playlist }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);

    if (!playlist?._id || !playlist.name) return null;

    const open = (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(`/playlist/${playlist._id}`);
    };

    return (
        <div className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded cursor-pointer transition-colors"
            onClick={open} role="button"
            tabIndex={0} aria-label={`Open playlist: ${playlist.name}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') open(e);
            }}
        >
        <img
            src={imageError ? DEFAULT_IMAGE : (playlist.image || DEFAULT_IMAGE)}
            alt={playlist.name}
            className="w-10 h-10 object-cover rounded"
            onError={() => setImageError(true)}
        />
        <div className="overflow-hidden">
            <p className="text-white truncate font-medium">{playlist.name}</p>
            <p className="text-gray-400 text-xs truncate">
            Playlist • {playlist.creator?.fullName || 'Unknown'}
            </p>
        </div>
        </div>
    );
};

export default PlaylistItem;
