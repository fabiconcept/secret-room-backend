import { Message } from "../models/messages.model";
import AppError from "../types/error.class";
import { Server } from "../models/server.model";
import { isUserInServer } from "./users.controller";
import { getSocketService } from "../sockets/index.socket";
import { response } from "express";

class MessagesController {
    private static instance: MessagesController;

    private constructor() {}

    public static getInstance(): MessagesController {
        if (!MessagesController.instance) {
            MessagesController.instance = new MessagesController();
        }
        return MessagesController.instance;
    }

    public async sendMessage(serverId: string, content: string, senderId: string, receiverId: string): Promise<void> {
        console.log('Sending message to server:', serverId);
        console.log('Message content:', content);
        console.log('Sender ID:', senderId);
        console.log('Receiver ID:', receiverId);
        
        if (!serverId || !content || !senderId || !receiverId) {
            throw new AppError(400, 'Missing required fields');
        }

        const server = await Server.findOne({ serverId });
        if (!server) {
            throw new AppError(404, 'Server not found');
        }
        const isSenderInServer = isUserInServer(serverId, senderId);
        if (!isSenderInServer) {
            throw new AppError(403, 'Sender is not a member of this server');
        }
        const isReceiverInServer = isUserInServer(serverId, receiverId);
        if (!isReceiverInServer) {
            throw new AppError(403, 'Receiver is not a member of this server');
        }

        const message = {
            serverId,
            content,
            senderId,
            receiverId,
            read: false,
            createdAt: new Date()
        };

        await new Message(message).save();

        const socketService = getSocketService();
        socketService.broadcastNewMessage(serverId, message);
    }
}

const messagesController = MessagesController.getInstance();

export default messagesController;