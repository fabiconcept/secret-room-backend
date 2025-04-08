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
import { addUserToServer, getActiveUsers, clearServerUsers, isUserInServer } from "./users.controller";
import { generateUsername } from "../utils/user.util";
import { Message } from "../models/messages.model";
import Invitation from "../models/invitation.model";
import { generateToken } from "../middleware/auth";
import { AuthRequest } from "../middleware/auth";
import { ServerAction } from "../types/server-socket.interface";

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
        const { serverName, encryptionKey, lifeSpan, fingerprint } = body;

        if (!serverName || !encryptionKey || !lifeSpan || !fingerprint) {
            throw new AppError(400, "All fields are required");
        }

        if (typeof serverName !== 'string' ||
            typeof encryptionKey !== 'string' ||
            typeof lifeSpan !== 'number' ||
            typeof fingerprint !== 'string') {
            throw new AppError(400, "Invalid field types. Expected: serverName (string), encryptionKey (string), lifeSpan (number), fingerprint (string)");
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
                userId: request.body.fingerprint,
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

            addUserToServer(server.serverId, {
                ...createUserIdentity,
                isOnline: true,
                lastSeen: new Date()
            });

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

    public async getServer(request: AuthRequest, response: Response, next: NextFunction): Promise<void> {
        try {
            const { serverId } = request.params;
            const userId = request.user?.userId;

            if (!serverId) {
                throw new AppError(400, "Server ID is required");
            }

            if (!userId) {
                throw new AppError(400, "User ID is required");
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

            // Check if user is in server
            const isActive = isUserInServer(serverId, userId as string);
            const username = generateUsername();

            if (!isActive) {
                // If user is not active but is the owner, add them back
                if (server.owner === userId) {
                    addUserToServer(serverId, {
                        userId: userId as string,
                        username,
                        isOnline: true,
                        lastSeen: new Date()
                    });
                } else {
                    throw new AppError(403, "You are not a member of this server");
                }
            }

            // Connect to socket
            const socketService = getSocketService();
            if (socketService) {
                console.log('[getServer] Emitting join_server event for user:', { userId, serverId });
                socketService.emitServerActions(serverId, ServerAction.JOIN, username);
            } else {
                console.warn('[getServer] Socket service not available');
            }

            response.status(200).json({
                message: "Server found",
                data: {
                    server_name: server.serverName,
                    server_id: server.serverId,
                    expiration: server.expiresAt,
                    global_invitation_id: server.globalInvitationId,
                    owner: server.owner,
                    username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    public async getServerActiveUsers(request: AuthRequest, response: Response, next: NextFunction): Promise<void> {
        try {
            const { serverId } = request.params;
            const userId = request.user?.userId;

            if (!serverId) {
                throw new AppError(400, "Server ID is required");
            }

            if (!userId) {
                throw new AppError(400, "User Fingerprint is required");
            }

            const isServerUser = isUserInServer(serverId, userId);
            if (!isServerUser) {
                throw new AppError(403, "You are not a member of this server");
            }

            const server = await Server.findOne({ serverId });
            if (!server) {
                throw new AppError(404, "Server not found");
            }

            const activeUsers = await getActiveUsers(server.serverId);

            response.status(200).json({
                message: "Active users retrieved successfully",
                data: activeUsers
            });
        } catch (error) {
            next(error);
        }
    }

    public async globalInvitation(request: Request, response: Response, next: NextFunction): Promise<void> {
        try {
            const { globalInvitationId } = request.params;
            const { fingerprint } = request.body;

            if (!globalInvitationId) {
                throw new AppError(400, "Global invitation ID is required");
            }

            if (!fingerprint) {
                throw new AppError(400, "A fingerprint ID is required");
            }

            // Find server by global invitation ID
            const server = await Server.findOne({ globalInvitationId });


            if (!server) {
                throw new AppError(404, "Invalid invitation link");
            }

            // Check if server has expired
            if (server.expiresAt < new Date()) {
                throw new AppError(410, "This server has expired");
            }

            // Check if user already exists in server
            const userIdentityExist = await isUserInServer(server.serverId, fingerprint) || false;

            const userIdentity = {
                userId: fingerprint,
                username: generateUsername(),
            };

            // If user doesn't exist, create new identity
            if (userIdentityExist) {
                throw new AppError(409, `You are already in this server_${server.serverId}`);
            }

            addUserToServer(server.serverId, {
                ...userIdentity,
                isOnline: true,
                lastSeen: new Date()
            });

            const socketService = getSocketService();
            socketService.emitServerActions(server.serverId, ServerAction.JOIN, userIdentity.username);

            // Generate JWT token for the user
            const token = generateToken({
                userId: userIdentity.userId,
                serverId: server.serverId
            });

            // Return server details needed for joining
            response.status(200).json({
                success: true,
                data: {
                    serverId: server.serverId,
                    serverName: server.serverName,
                    expiresAt: server.expiresAt
                },
                user: userIdentity,
                token
            });

        } catch (error) {
            next(error);
        }
    }

    public async uniqueInvitation(request: Request, response: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = request.params;
            const { fingerprint } = request.body; // Assuming fingerprint comes from request body
    
            if (!inviteCode) {
                throw new AppError(400, "Invite code is required");
            }
    
            if (!fingerprint) {
                throw new AppError(400, "Fingerprint is required");
            }
    
            console.log({
                inviteCode,
                fingerprint
            });
            
            const invitation = await Invitation.findOne({ inviteCode });
            
            if (!invitation) {
                throw new AppError(404, "Server invitation not found");
            }
    
            if (invitation.used) {
                throw new AppError(409, "Server invitation already used");
            }
            
            const server = await Server.findOne({ serverId: invitation.serverId });
    
            if (!server) {
                throw new AppError(404, "Server not found");
            }
    
            // Check if user already exists in server
            const userIdentityExist = await isUserInServer(server.serverId, fingerprint) || false;
    
            const userIdentity = {
                userId: fingerprint,
                username: generateUsername(),
            };
    
            // If user doesn't exist, create new identity
            if (userIdentityExist) {
                throw new AppError(409, `You are already in this server_${server.serverId}`);
            }
    
            addUserToServer(server.serverId, {
                ...userIdentity,
                isOnline: true,
                lastSeen: new Date()
            });
    
            const socketService = getSocketService();
            socketService.emitServerActions(server.serverId, ServerAction.JOIN, userIdentity.username);
    
            // Generate JWT token for the user
            const token = generateToken({
                userId: userIdentity.userId,
                serverId: server.serverId
            });
    
            // Return server details needed for joining
            response.status(200).json({
                success: true,
                data: {
                    serverId: server.serverId,
                    serverName: server.serverName,
                    expiresAt: server.expiresAt
                },
                user: userIdentity,
                token
            });
    
        } catch (error) {
            next(error);
        }
    }

    public async generateUniqueServerInvitationId(request: Request, response: Response, next: NextFunction): Promise<void> {
        try {
            const { serverId } = request.params;

            if (!serverId) {
                throw new AppError(400, "Server ID is required");
            }

            const server = await Server.findOne({ serverId });
            if (!server) {
                throw new AppError(404, "Server not found");
            }

            const uniqueInvitationId =  `invite-${generateId()}`;
            
            const invitation = new Invitation({
                inviteCode: uniqueInvitationId,
                used: false,
                serverId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            await invitation.save();

            response.status(200).json({
                message: "Server invitation ID generated successfully",
                data: { 
                    inviteCode: uniqueInvitationId
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

export const GetServerActiveUsers = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.getServerActiveUsers(req, res, next);

export const GlobalInvitation = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.globalInvitation(req, res, next);

export const UniqueInvitation = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.uniqueInvitation(req, res, next);

export const GenerateUniqueServerInvitationId = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    serverController.generateUniqueServerInvitationId(req, res, next);