import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/dotenv.config";
import AppError from "../types/error.class";
import { Server } from "../models/server.model";

export interface JWTPayload {
    userId: string;
    serverId: string;
}

export interface AuthRequest extends Request {
    apiKey?: string;
    user?: JWTPayload;
}

class AuthMiddleware {
    private static instance: AuthMiddleware;
    private readonly API_KEY_HEADER = "X-API-Key";

    private constructor() { }

    public static getInstance(): AuthMiddleware {
        if (!AuthMiddleware.instance) {
            AuthMiddleware.instance = new AuthMiddleware();
        }
        return AuthMiddleware.instance;
    }

    private validateApiKey(apiKey: string | undefined): string {
        if (!apiKey) {
            throw new AppError(401, "Access denied. No API key provided.");
        }

        if (apiKey !== config.API_KEY) {
            throw new AppError(401, "Invalid API key.");
        }

        return apiKey;
    }

    private extractToken(token: string | undefined): string {
        if (!token) {
            throw new AppError(401, "Access denied. No token provided.");
        }

        return token;
    }

    private verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError(401, "Token has expired.");
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError(401, "Invalid token.");
            }
            throw new AppError(401, "Token verification failed.");
        }
    }

    private async validateServerAccess(payload: JWTPayload): Promise<void> {
        const server = await Server.findOne({ serverId: payload.serverId });
        if (!server) {
            throw new AppError(404, "Server not found");
        }

        if (server.expiresAt < new Date()) {
            throw new AppError(410, "Server has expired");
        }
    }

    public authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Always validate API key
            const apiKey = this.validateApiKey(req.header(this.API_KEY_HEADER));
            req.apiKey = apiKey;
            next();
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Internal server error during authentication." });
            }
        }
    }

    public authenticateWithJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // First validate API key
            const apiKey = this.validateApiKey(req.header(this.API_KEY_HEADER));

            req.apiKey = apiKey;

            // Then validate JWT token
            const rawToken = req.header("Authorization");
            const token = this.extractToken(rawToken);
            const decoded = this.verifyToken(token);


            // Validate server access
            await this.validateServerAccess(decoded);

            req.user = decoded;

            next();
        } catch (error) {

            if (error instanceof AppError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Internal server error during authentication." });
            }
        }
    }

    public generateToken(payload: JWTPayload): string {
        return jwt.sign(payload, config.JWT_SECRET, {
            expiresIn: "24h" // Token expires in 24 hours
        });
    }
}

// Export singleton instance method
export const authMiddleware = AuthMiddleware.getInstance();

// Export authenticate middleware
export const authenticateUser = authMiddleware.authenticate;

// Export authenticateWithJWT middleware
export const authenticateUserWithJWT = authMiddleware.authenticateWithJWT;

// Export token generator
export const generateToken = (payload: JWTPayload): string =>
    authMiddleware.generateToken(payload);