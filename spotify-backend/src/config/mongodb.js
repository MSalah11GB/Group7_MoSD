import mongoose from "mongoose";

export const listDbCollections = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected');
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.map((c) => c.name).sort();
};

const connectDB = async () => {

    mongoose.connection.on('connected', () => {
        console.log("connection establised");
    })

    await mongoose.connect(`${process.env.MONGODB_URI}/Musicify`);
}

export default connectDB;
