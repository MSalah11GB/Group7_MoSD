import mongoose from "mongoose";

export const listDbCollections = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected');
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.map((c) => c.name).sort();
};

export const listDbSongs = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected');
    }

    // Use the native driver to avoid model import/circular-deps.
    // Mongoose default collection name for Song model is typically "songs".
    const collectionNames = await listDbCollections();
    if (!collectionNames.includes('songs')) return [];

    return mongoose.connection.db
        .collection('songs')
        .find({}, { projection: { _id: 1, name: 1, artist: 1, album: 1, duration: 1, image: 1, file: 1 } })
        .toArray();
};

const connectDB = async () => {

    mongoose.connection.on('connected', () => {
        console.log("connection establised");
    })

    await mongoose.connect(`${process.env.MONGODB_URI}/Musicify`);
}

export default connectDB;
