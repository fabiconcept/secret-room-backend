import "./src/config/dotenv.config";
import app from "./src/app";
import { createServer } from "http";
import { Server } from "socket.io";
import { config } from "./src/config/dotenv.config";
import connectDB from "./src/config/db";


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

// Start the server
server.listen(PORT, HOST, async () => {
    await connectDB();
});