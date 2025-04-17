import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import { config } from "./config/dotenv.config";
import * as ServerRoute from "./routes/server.routes";
import messagesRouter from "./routes/messages.route";

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));

app.use("/api/server", ServerRoute.default);
app.use("/api/messages", messagesRouter);
app.use("/", (req, res) => {
    res.send("Welcome to Secret Room API");
});

app.use(errorHandler);

export default app;