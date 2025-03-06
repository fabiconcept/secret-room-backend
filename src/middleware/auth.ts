import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/dotenv.config";

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next(); // Pass control to the next middleware/route handler
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};