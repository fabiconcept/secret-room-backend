import express from "express";
import { CreateServer, GetServer, GetServerActiveUsers, GlobalInvitation } from "../controllers/server.controller";
import { authenticateUser, authenticateUserWithJWT } from "../middleware/auth";

const router = express.Router();

// Public route with API key only
router.post("/", authenticateUser, CreateServer);
router.post("/invitation/:globalInvitationId", authenticateUser, GlobalInvitation);

// Private route with JWT
router.get("/:serverId", authenticateUserWithJWT, GetServer);
router.get("/:serverId/active-users", authenticateUserWithJWT, GetServerActiveUsers);

export default router;