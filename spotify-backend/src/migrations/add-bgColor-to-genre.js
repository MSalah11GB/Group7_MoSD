import mongoose from "mongoose";
import genreModel from "../models/genreModel.js";
import 'dotenv/config.js'

async function migrate() {
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
        process.exit(0);
    }
}

migrate();