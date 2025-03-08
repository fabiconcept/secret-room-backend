import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
    serverId: { type: String, required: true, unique: true },
    serverName: { type: String, required: true },
    salt: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const Server = mongoose.model("Server", serverSchema);