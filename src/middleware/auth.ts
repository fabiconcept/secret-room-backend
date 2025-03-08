import { Request, Response, NextFunction } from "express";
import { config } from "../config/dotenv.config";
import AppError from "../types/error.class";

export interface AuthRequest extends Request {
    apiKey?: string;
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

    public authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
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
}

// Export singleton instance method
export const authenticateUser = AuthMiddleware.getInstance().authenticate;