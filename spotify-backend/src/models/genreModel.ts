import mongoose from 'mongoose';

const genreSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bgColor: { type: String, default: '#000000', required: true },
});

const genreModel = mongoose.model('genre', genreSchema);

export default genreModel;
