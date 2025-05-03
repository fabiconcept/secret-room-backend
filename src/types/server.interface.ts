import { Request, Response, NextFunction } from 'express';

export interface CreateServerRequest {
    serverName: string;
    encryptionKey: string;
    lifeSpan: number;
    fingerprint: string;
}

export interface ServerResponse {
    server_name: string;
    server_id: string;
    expiration: Date;
}

export interface ServerData {
    serverId: string;
    serverName: string;
    salt: string;
    expiresAt: Date;
    isActive?: boolean;
}

export interface IServerController {
    createServer(req: Request, res: Response, next: NextFunction): Promise<void>;
    validateRequest(body: any): body is CreateServerRequest;
    generateServerData(request: CreateServerRequest): ServerData;
    formatResponse(server: ServerData): ServerResponse;
}