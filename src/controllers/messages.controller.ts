import { Message } from "../models/messages.model";
import AppError from "../types/error.class";
import { Server } from "../models/server.model";
import { isUserInServer } from "./users.controller";
import { getSocketService } from "../sockets/index.socket";
import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { decryptMessage } from "../utils/messages.utli";

class MessagesController {
    private static instance: MessagesController;

    private constructor() {}

    public static getInstance(): MessagesController {
        if (!MessagesController.instance) {
            MessagesController.instance = new MessagesController();
        }
        return MessagesController.instance;
    }

    public async sendMessage(serverId: string, content: string, senderId: string, receiverId: string, attachmentUrl?: string, sent: boolean = true): Promise<void> {
        if (!serverId || !senderId || !receiverId) {
            throw new AppError(400, 'Missing required fields');
        }

        if (!content && !attachmentUrl) {
            throw new AppError(400, 'Message content or attachment is required');
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

        const payload = {
            serverId,
            content,
            senderId,
            receiverId,
            attachmentUrl: attachmentUrl || null,
            readBySender: false,
            readByReceiver: false,
            sent: sent || false,
            createdAt: new Date()
        };

        const message = await new Message(payload).save();

        const output = {
            serverId: message.serverId,
            content: payload.content,
            senderId: message.senderId,
            receiverId: message.receiverId,
            readBySender: message.readBySender,
            readByReceiver: message.readByReceiver,
            messageId: message.messageId,
            createdAt: message.createdAt,
            sent: message.sent,
            attachmentUrl: payload.attachmentUrl || undefined
        }
        const socketService = getSocketService();
        socketService.broadcastNewMessage(serverId, output);
    }

    public async getMessages(request: AuthRequest, response: Response, next: NextFunction): Promise<void> {
        try {
            const { serverId } = request.params;
            const userId = request.user?.userId;

            if (!userId) {
                throw new AppError(400, "User ID is required");
            }

            if (!serverId) {
                throw new AppError(400, "Server ID is required");
            }

            const server = await Server.findOne({ serverId });
            if (!server) {
                throw new AppError(404, "Server not found");
            }

            const isServerUser = isUserInServer(serverId, userId);
            if (!isServerUser) {
                throw new AppError(403, "You are not a member of this server");
            }
            
            const messages = await Message.find({ serverId });

            response.status(200).json({
                message: "Messages found",
                data: messages.map(message => ({
                    ...message.toObject(),
                    content: decryptMessage(message.content, server.salt),
                    attachmentUrl: message.attachmentUrl ? decryptMessage(message.attachmentUrl, server.salt) : null,
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    public async markMessageRead(messageId: string): Promise<void> {
        console.log('Marking message read in controller:', messageId)
        try {
            const message = await Message.findOne({ messageId });
            if (!message) {
                throw new AppError(404, "Message not found");
            }
            message.readByReceiver = true;
            await message.save();

            const socketService = getSocketService();
            socketService.broadcastMessageRead(messageId, message.serverId);
        } catch (error) {
            throw error;
        }
    }
}

const messagesController = MessagesController.getInstance();

export default messagesController;