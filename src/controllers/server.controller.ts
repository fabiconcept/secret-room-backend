import { NextFunction, Request, Response } from "express";
import { Server } from "../models/server.model";
import { generateId } from "../utils/server.util";
import AppError from "../types/error.class";
import {
    CreateServerRequest,
    ServerResponse,
    ServerData,
    IServerController
} from "../types/server.interface";

class ServerController implements IServerController {
    private static instance: ServerController;
    private readonly MIN_SERVER_NAME_LENGTH = 3;
    private readonly MAX_SERVER_NAME_LENGTH = 50;
    private readonly MIN_ENCRYPTION_KEY_LENGTH = 8;
    private readonly MIN_LIFESPAN = 1000 * 60 * 60; // 1 minute
    private readonly MAX_LIFESPAN = 1000 * 60 * 60 * 24; // 1 day

    private constructor() { }

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
        if (!/^[a-zA-Z0-9!@#$%^&*()]+$/.test(encryptionKey)) {
            throw new AppError(400, "Encryption key can only contain letters, numbers, and special characters");
        }
    }

    private validateLifeSpan(lifeSpan: number): void {
        if (lifeSpan < this.MIN_LIFESPAN) {
            throw new AppError(400, "Lifespan must be at least 1 minute");
        }
        if (lifeSpan > this.MAX_LIFESPAN) {
            throw new AppError(400, "Lifespan cannot exceed 1 week");
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

            const serverData = this.generateServerData(request.body);
            const server = new Server(serverData);
            await server.save();

            response.status(201).json({
                message: "Server created successfully",
                data: this.formatResponse(serverData)
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