import { Server, Socket } from "socket.io";
import { addUserToServer, removeUserFromServer, getActiveUsers } from "../controllers/users.controller";

export function setupSocket(io: Server, socket: Socket) {
    // User join a server
    socket.on("joinServer", ({ serverId, userId }) => {
        console.log({
            message: "A new user joined the Server",
            serverId,
            userId
        })
        addUserToServer(serverId, userId);
        io.to(serverId).emit("updateUsers", getActiveUsers(serverId));
    });
}
