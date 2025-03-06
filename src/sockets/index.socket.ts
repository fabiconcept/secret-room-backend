import { io } from "../../server";
import { setupSocket } from "./users.socket";

io.on("connection", (socket) => {
    console.log("a user connected");

    setupSocket(io, socket);

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});