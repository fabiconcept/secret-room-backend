import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    currentServer: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model("User", userSchema);
