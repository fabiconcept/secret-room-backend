import "./src/config/dotenv.config";
import app from "./src/app";
import { createServer } from "http";
import { Server } from "socket.io";
import { config } from "./src/config/dotenv.config";
import connectDB from "./src/config/db";
import cron from "node-cron";
import { CheckAndDestroyExpiredServers } from "./src/controllers/server.controller";

// Constants
const PORT = config.PORT;
const HOST = config.HOST;

// HTTP Server
const server = createServer(app);

// Socket.IO
export const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});

import "./src/sockets/index.socket";


// Set up cron job to check for expired servers every minute
cron.schedule('* * * * *', async () => {
    console.log("Checking for expired servers...");
    await CheckAndDestroyExpiredServers();
    console.log("Cleaner job completed");
});

// Start the server
server.listen(PORT, async () => {
    await connectDB();
    console.log(`Server is running on http://${HOST}:${PORT}`);
});