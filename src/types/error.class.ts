class AppError extends Error {
    statusCode: number;

    constructor(statusCode: number = 500, message: string = "Internal Server Error") {
        super(message);
        this.statusCode = statusCode;
    }
}

export default AppError;