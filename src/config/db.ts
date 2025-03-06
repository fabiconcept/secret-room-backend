import mongoose from "mongoose";
import { config } from "./dotenv.config";

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

export default connectDB;