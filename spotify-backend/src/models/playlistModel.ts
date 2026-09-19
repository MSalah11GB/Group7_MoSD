import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'song' }],
    isPublic: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

playlistSchema.virtual('songCount').get(function () {
  return this.songs.length;
});

playlistSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const playlistModel = mongoose.model('playlist', playlistSchema);

export default playlistModel;
