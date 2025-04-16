import express from "express";
import { CreateServer, DeleteServer, GenerateUniqueServerInvitationId, GetServer, GetServerActiveUsers, GlobalInvitation, UniqueInvitation } from "../controllers/server.controller";
import { authenticateUser, authenticateUserWithJWT } from "../middleware/auth";
import messagesController from "../controllers/messages.controller";

const router = express.Router();

// Public route with API key only
router.post("/", authenticateUser, CreateServer);
router.post("/invitation/:globalInvitationId", authenticateUser, GlobalInvitation);
router.post("/unique-invitation/:inviteCode", authenticateUser, UniqueInvitation);

// Private route with JWT
router.get("/:serverId", authenticateUserWithJWT, GetServer);
router.get("/:serverId/active-users", authenticateUserWithJWT, GetServerActiveUsers);
router.get("/:serverId/generate-unique-server-invitation-id", authenticateUserWithJWT, GenerateUniqueServerInvitationId);
router.get("/:serverId/messages", authenticateUserWithJWT, messagesController.getMessages);
router.delete("/:serverId", authenticateUserWithJWT, DeleteServer);
export default router;