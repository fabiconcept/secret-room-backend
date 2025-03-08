import express from "express";
import { CreateServer, GetServer } from "../controllers/server.controller";
import { authenticateUser, authenticateUserWithJWT } from "../middleware/auth";

const router = express.Router();

// Public route with API key only
router.post("/", authenticateUser, CreateServer);
router.get("/:serverId", authenticateUser, GetServer);

export default router;