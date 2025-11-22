import express from 'express'
import cors from 'cors'
import 'dotenv/config.js'
import connectDB from './src/config/mongodb.js';
import connectCloudinary from './src/config/cloudinary.js';
import albumRouter from './src/routes/albumRoute.js';
import artistRouter from './src/routes/artistRoute.js';
import genreRouter from './src/routes/genreRoute.js';
import songRouter from './src/routes/songRoute.js';

//app config
const app = express()
const port = process.env.PORT  || 4000;
connectDB();
connectCloudinary();

//middleware
app.use(express.json());
app.use(cors());

//initializing routes
app.use("/api/album", albumRouter)
app.use("/api/artist", artistRouter)
app.use("/api/genre", genreRouter)
app.use("/api/song", songRouter)

app.get('/',(req, res)=> res.send("API Working"))

app.listen(port, ()=>console.log(`Server started on ${port}`))