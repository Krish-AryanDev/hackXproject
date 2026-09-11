import { ApiError } from '../utils/apiError.util.js';
import env from '../config/env.js';

/**
 * Global centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
    let error = err;

    // If error is not an instance of ApiError, normalize it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || (error.status ? parseInt(error.status, 10) : 500);
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors || [],
        ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    };

    if (error.statusCode >= 500) {
        console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    }

    return res.status(error.statusCode).json(response);
};

export default errorHandler;
