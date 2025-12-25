import mongoose from "mongoose";
import genreModel from "../models/genreModel.js";
import 'dotenv/config.js'
import { pathToFileURL } from 'url';

export async function migrate({ exitProcess = true } = {}) {
    console.log(process.env.MONGODB_URI);
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/Musicify`);

        const result = await genreModel.updateMany(
            { bgColor: { $exists: false } },
            { $set: { bgColor: "#000000" } }
        );

        console.log("Migration complete:", result.modifiedCount, "documents updated");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.disconnect();
        if (exitProcess) {
            process.exit(0);
        }
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    migrate();
}