import express from "express";
import { CreateServer } from "../controllers/server.controller";

const router = express.Router();

// Create Server
router.post("/", CreateServer);

export default router;