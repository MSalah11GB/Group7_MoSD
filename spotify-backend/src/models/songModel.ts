import mongoose from 'mongoose';

const songSchema = new mongoose.Schema({
  name: { type: String, required: true },
  artist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'artist', index: true }],
  artistName: { type: String, default: '' },
  albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'album', default: null, index: true },
  image: { type: String, required: true },
  file: { type: String, required: true },
  duration: { type: String, required: true },
  lrcFile: { type: String, default: '' },
  genres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'genre', index: true }],
});

/** Populate this on any query whose results are sent to clients, so they get the album name. */
export const ALBUM_POPULATE = { path: 'albumId', select: 'name' } as const;

// Clients read `song.album` as the album's name; the database stores only a reference.
songSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    const album = ret.albumId;
    if (album && typeof album === 'object' && 'name' in album) {
      ret.album = album.name;
      ret.albumId = album._id;
    } else if (album == null) {
      ret.album = 'none';
    }
    return ret;
  },
});

const songModel = mongoose.model('song', songSchema);

export default songModel;
