import mongoose from "mongoose";
import { Server } from "./server.model"; // Import server model to retrieve salt
import { encryptMessage } from "../utils/messages.utli";

const messageSchema = new mongoose.Schema({
    serverId: { type: String, required: true, ref: "Server" }, // Server context
    senderId: { type: String, required: true }, // Who sent it
    receiverId: { type: String, required: true }, // Who received it
    content: { type: String, required: true }, // Encrypted message text
    createdAt: { type: Date, default: Date.now },
});

// Encrypt message before saving
messageSchema.pre("save", async function (next) {
    const message = this;
    const server = await Server.findOne({ serverId: message.serverId });
    if (!server) return next(new Error("Server not found"));

    const encryptedContent = encryptMessage(message.content, server.salt);
    message.content = encryptedContent;
    next();
});

export const Message = mongoose.model("Message", messageSchema);