import express from "express";
import messagesController from "../controllers/messages.controller";
import { authenticateUserWithJWT } from "../middleware/auth";

const messagesRouter = express.Router();

// Private route with JWT
messagesRouter.get("/:serverId", authenticateUserWithJWT, messagesController.getMessages);

export default messagesRouter;
