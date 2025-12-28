import mongoose from "mongoose";

const buildMongoUri = (baseUri, defaultDbName) => {
    if (!baseUri) throw new Error('MONGODB_URI is required');

    const [withoutQuery, query] = baseUri.split('?');
    const cleaned = withoutQuery.replace(/\/+$/, '');

    const afterScheme = cleaned.replace(/^mongodb(\+srv)?:\/\//, '');
    const slashIndex = afterScheme.indexOf('/');
    const hasDbName = slashIndex !== -1 && afterScheme.slice(slashIndex + 1).length > 0;

    if (hasDbName) return baseUri;

    const uriWithDb = `${cleaned}/${defaultDbName}`;
    return query ? `${uriWithDb}?${query}` : uriWithDb;
};

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

export const countDbSongs = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected');
    }

    const collectionNames = await listDbCollections();
    if (!collectionNames.includes('songs')) return 0;

    return mongoose.connection.db.collection('songs').countDocuments({});
};

export const getDbInfo = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected');
    }

    const dbName = mongoose.connection.db.databaseName || mongoose.connection.name;
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const readyState = mongoose.connection.readyState;

    const collections = await listDbCollections();
    const counts = {};
    for (const collectionName of collections) {
        // estimatedDocumentCount is fast and doesn’t require a full scan
        counts[collectionName] = await mongoose.connection.db
            .collection(collectionName)
            .estimatedDocumentCount();
    }

    return { dbName, host, port, readyState, collections, counts };
};

const connectDB = async () => {

    mongoose.connection.on('connected', () => {
        const dbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
        console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${dbName}`);
    })

    const uri = buildMongoUri(process.env.MONGODB_URI, 'Musicify');
    await mongoose.connect(uri);
}

export default connectDB;
