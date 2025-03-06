import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import { config } from "./config/dotenv.config";

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));

app.get("/", (req, res) => {
    res.send("Hello World!");
})

app.use(errorHandler);

export default app;