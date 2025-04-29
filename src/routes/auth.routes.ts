import express from "express";
import { authenticateUser } from "../middleware/auth";
import { refreshToken } from "../controllers/auth.controller";

const authRouter = express.Router();

// Add refresh token endpoint
authRouter.post("/refresh-token", authenticateUser, refreshToken);

export default authRouter;
