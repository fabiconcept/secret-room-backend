import express from "express";
import { CreateServer, GenerateUniqueServerInvitationId, GetServer, GetServerActiveUsers, GlobalInvitation, UniqueInvitation } from "../controllers/server.controller";
import { authenticateUser, authenticateUserWithJWT } from "../middleware/auth";

const router = express.Router();

// Public route with API key only
router.post("/", authenticateUser, CreateServer);
router.post("/invitation/:globalInvitationId", authenticateUser, GlobalInvitation);
router.post("/ç/:inviteCode", authenticateUser, UniqueInvitation);

// Private route with JWT
router.get("/:serverId", authenticateUserWithJWT, GetServer);
router.get("/:serverId/active-users", authenticateUserWithJWT, GetServerActiveUsers);
router.get("/:serverId/generate-unique-server-invitation-id", authenticateUserWithJWT, GenerateUniqueServerInvitationId);

export default router;