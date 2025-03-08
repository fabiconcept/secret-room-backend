import dotenv from "dotenv";

(() => {
    dotenv.config();
})();

export const config = {
    PORT: parseInt(process.env.PORT || "3001"),
    HOST: process.env.HOST || "localhost",
    JWT_SECRET: process.env.JWT_SECRET || "supersecretkey",
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/secret-room",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
    API_KEY: process.env.API_KEY || "supersecretkey",
}