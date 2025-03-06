import { Request, Response, NextFunction } from 'express';
import AppError from '../types/error.class';

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(err.statusCode).json({
        message: err.message,
        statusCode: err.statusCode
    });
};

export default errorHandler;