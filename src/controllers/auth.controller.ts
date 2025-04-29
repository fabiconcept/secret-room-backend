import { Server } from "../models/server.model";
import { AuthRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import AppError from "../types/error.class";
import { isUserInServer } from "./users.controller";
import { User } from "../models/user.model";
import { NextFunction, Request, Response } from "express";

export class AuthController {
    private static instance: AuthController;
    private constructor() {}

    public static getInstance(): AuthController {
        if (!AuthController.instance) {
            AuthController.instance = new AuthController();
        }
        return AuthController.instance;
    }

    public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { userId, serverId } = req.body;
            
            if (!serverId) {
                throw new AppError(400, 'Server ID is required');
            }
    
            const server = await Server.findOne({ serverId });
    
            if (!server) {
                throw new AppError(404, 'Server not found');
            }
    
            const user = await User.findOne({ userId });
            if (!user) {
                throw new AppError(404, 'User not found');
            }
            const isServerUser = await isUserInServer(serverId, userId);
    
            if (!isServerUser) {
                throw new AppError(403, 'You are not a member of this server');
            }
            const token = authMiddleware.generateToken({ userId, serverId });   
            res.status(200).json({
                message: 'Token generated successfully',
                token
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = AuthController.getInstance();

export const refreshToken = (req: Request, res: Response, next: NextFunction): Promise<void> =>
    authController.refreshToken(req, res, next);
