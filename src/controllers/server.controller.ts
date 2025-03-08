import { NextFunction, Request, Response } from "express";
import { Server } from "../models/server.model";
import { generateId } from "../utils/index.util";
import AppError from "../types/error.class";
import {
    CreateServerRequest,
    ServerResponse,
    ServerData,
    IServerController
} from "../types/server.interface";
import { getSocketService } from "../sockets/index.socket";
import { addUserToServer, getActiveUsers, clearServerUsers } from "./users.controller";
import { generateUsername } from "../utils/user.util";
import { Message } from "../models/messages.model";
import Invitation from "../models/invitation.model";
import { generateToken } from "../middleware/auth";

class ServerController implements IServerController {
    private static instance: ServerController;
    private readonly MIN_SERVER_NAME_LENGTH = 3;
    private readonly MAX_SERVER_NAME_LENGTH = 50;
    private readonly MIN_ENCRYPTION_KEY_LENGTH = 8;
    private readonly MIN_LIFESPAN = 1000 * 60 * 60;
    private readonly MAX_LIFESPAN = 1000 * 60 * 60 * 24;

    // Character sets for encryption key validation
    private readonly VALID_CHARS = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        hexChars: 'ABCDEF0123456789',
        base64Chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    };

    public static getInstance(): ServerController {
        if (!ServerController.instance) {
            ServerController.instance = new ServerController();
        }
        return ServerController.instance;
    }

    public validateRequest(body: any): body is CreateServerRequest {
        const { serverName, encryptionKey, lifeSpan } = body;

        if (!serverName || !encryptionKey || !lifeSpan) {
            throw new AppError(400, "All fields are required");
        }

        if (typeof serverName !== 'string' ||
            typeof encryptionKey !== 'string' ||
            typeof lifeSpan !== 'number') {
            throw new AppError(400, "Invalid field types. Expected: serverName (string), encryptionKey (string), lifeSpan (number)");
        }

        this.validateServerName(serverName);
        this.validateEncryptionKey(encryptionKey);
        this.validateLifeSpan(lifeSpan);

        return true;
    }

    private validateServerName(serverName: string): void {
        if (serverName.length < this.MIN_SERVER_NAME_LENGTH) {
            throw new AppError(400, `Server name must be at least ${this.MIN_SERVER_NAME_LENGTH} characters long`);
        }
        if (serverName.length > this.MAX_SERVER_NAME_LENGTH) {
            throw new AppError(400, `Server name cannot exceed ${this.MAX_SERVER_NAME_LENGTH} characters`);
        }
        if (!/^[a-zA-Z0-9-_\s]+$/.test(serverName)) {
            throw new AppError(400, "Server name can only contain letters, numbers, spaces, hyphens, and underscores");
        }
    }

    private validateEncryptionKey(encryptionKey: string): void {
        if (encryptionKey.length < this.MIN_ENCRYPTION_KEY_LENGTH) {
            throw new AppError(400, `Encryption key must be at least ${this.MIN_ENCRYPTION_KEY_LENGTH} characters long`);
        }

        const validChars = new Set([
            ...this.VALID_CHARS.uppercase,
            ...this.VALID_CHARS.lowercase,
            ...this.VALID_CHARS.numbers,
            ...this.VALID_CHARS.specialChars,
            ...this.VALID_CHARS.base64Chars
        ]);

        const invalidChars = [...encryptionKey].filter(char => !validChars.has(char));
        if (invalidChars.length > 0) {
            throw new AppError(400, `Invalid characters in encryption key: ${invalidChars.join(' ')}`);
        }
    }

    private validateLifeSpan(lifeSpan: number): void {
        if (lifeSpan < this.MIN_LIFESPAN) {
            throw new AppError(400, "Lifespan must be at least 1 hour");
        }
        if (lifeSpan > this.MAX_LIFESPAN) {
            throw new AppError(400, "Lifespan cannot exceed 1 day");
        }
    }

    public generateServerData(request: CreateServerRequest): ServerData {
        return {
            serverId: `server-${generateId()}`,
            serverName: request.serverName.trim(),
            salt: request.encryptionKey,
            expiresAt: new Date(Date.now() + request.lifeSpan)
        };
    }

    public formatResponse(server: ServerData): ServerResponse {
        return {
            server_name: server.serverName,
            server_id: server.serverId,
            expiration: server.expiresAt
        };
    }

    public async createServer(request: Request, response: Response, next: NextFunction): Promise<void> {
        try {
            this.validateRequest(request.body);

            const createUserIdentity = {
                userId: `user-${generateId()}`,
                username: generateUsername(),
            }

            const serverData = this.generateServerData(request.body);
            const server = new Server({
                ...serverData,
                owner: createUserIdentity.userId,
                globalInvitationId: `global-${generateId()}`
            });

            await server.save();

            const formattedResponse = this.formatResponse(serverData);

            addUserToServer(serverData.serverId, createUserIdentity);

            // Generate JWT token for the new user
            const token = generateToken({
                userId: createUserIdentity.userId,
                serverId: serverData.serverId
            });

            // Get socket service and emit server creation event
            const socketService = getSocketService();
            socketService.emitToServer(serverData.serverId, {
                type: 'status',
                content: 'Server created successfully',
                timestamp: Date.now()
            });

            response.status(201).json({
                message: "Server created successfully",
                data: {
                    ...formattedResponse,
                    global_invitation_id: server.globalInvitationId,
                    owner: server.owner
                },
                user: createUserIdentity,
                token
            });
        } catch (error) {
            next(error);
        }
    }

    public async getServer(request: Request, response: Response, next: NextFunction): Promise<void> {
        try {
            const { serverId } = request.params;

            if (!serverId) {
                throw new AppError(400, "Server ID is required");
            }

            const server = await Server.findOne({ serverId });
            if (!server) {
                throw new AppError(404, "Server not found");
            }

            // Check if server has expired
            if (server.expiresAt < new Date()) {
                await Server.deleteOne({ serverId });
                await Message.deleteMany({ serverId });
                await Invitation.deleteMany({ serverId });
                clearServerUsers(serverId);
                throw new AppError(410, "Server has expired and been deleted");
            }

            response.status(200).json({
                message: "Server found",
                data: {
                    server_name: server.serverName,
                    server_id: server.serverId,
                    expiration: server.expiresAt,
                    global_invitation_id: server.globalInvitationId,
                    owner: server.owner,
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

// Export singleton instance
export const serverController = ServerController.getInstance();

// Export controller method for route handler
export const CreateServer = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.createServer(req, res, next);

export const GetServer = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.getServer(req, res, next);