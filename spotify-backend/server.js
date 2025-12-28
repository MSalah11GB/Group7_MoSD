import express from 'express'
import cors from 'cors'
import 'dotenv/config.js'
import connectDB, { countDbSongs, listDbCollections } from './src/config/mongodb.js';
import connectCloudinary from './src/config/cloudinary.js';
import albumRouter from './src/routes/albumRoute.js';
import artistRouter from './src/routes/artistRoute.js';
import authRouter from './src/routes/authRoute.js';
import genreRouter from './src/routes/genreRoute.js';
import songRouter from './src/routes/songRoute.js';
import userRouter from './src/routes/userRoute.js';
import playlistRouter from './src/routes/playlistRoute.js';
import dbRouter from './src/routes/dbRoute.js';
import { clerkMiddleware} from '@clerk/express'
//app config
const app = express()
const port = process.env.PORT  || 4000;

//middleware
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

//initializing routes

app.use("/api/album", albumRouter)
app.use("/api/artist", artistRouter)
app.use("/api/users", userRouter)
app.use("/api/auth", authRouter)
app.use("/api/genre", genreRouter)
app.use("/api/song", songRouter)
app.use("/api/playlist", playlistRouter)
app.use("/api/db", dbRouter)

app.get('/',(req, res)=> res.send("API Working"))

const startServer = async () => {
	await connectDB();

	try {
		const collections = await listDbCollections();
		console.log('MongoDB collections:', collections);

		const songCount = await countDbSongs();
		console.log('MongoDB song count:', songCount);
	} catch (error) {
		console.warn('Failed to list MongoDB collections on startup:', error?.message || error);
	}

	await connectCloudinary();

	app.listen(port, () => console.log(`Server started on ${port}`))
};

startServer();