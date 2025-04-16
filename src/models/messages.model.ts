import mongoose from "mongoose";
import { Server } from "./server.model";
import { encryptMessage } from "../utils/messages.utli";
import { generateId } from "../utils/index.util";

const messageSchema = new mongoose.Schema({
    serverId: { type: String, required: true, ref: "Server" },
    senderId: { type: String, required: true, ref: "User" },
    receiverId: { type: String, required: true, ref: "User" },
    messageId: { type: String, required: true, unique: true, default: () => `txt-${generateId()}` },
    content: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    sent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    readBySender: { type: Boolean, default: true },
    readByReceiver: { type: Boolean, default: false }
});

// Encrypt message before saving
messageSchema.pre("save", async function (next) {
    if (!this.serverId) return next(new Error("Server ID is required"));
    if (this.readByReceiver) return next();
    
    const message = this;
    const server = await Server.findOne({ serverId: message.serverId });
    if (!server) return next(new Error("Server not found"));

    const encryptedContent = encryptMessage(message.content, server.salt);
    message.content = encryptedContent;
    
    if (message.attachmentUrl) {
        const encryptedAttachmentUrl = encryptMessage(message.attachmentUrl, server.salt);
        message.attachmentUrl = encryptedAttachmentUrl;
    }
    
    next();
});

export const Message = mongoose.model("Message", messageSchema);