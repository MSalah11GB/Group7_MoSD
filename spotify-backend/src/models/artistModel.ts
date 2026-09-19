import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bgColor: { type: String, required: true },
  image: { type: String, required: true },
});

const artistModel = mongoose.model('artist', artistSchema);

export default artistModel;
