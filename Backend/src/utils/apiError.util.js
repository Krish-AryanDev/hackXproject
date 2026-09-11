/**
 * Custom Operational API Error Class
 */
export class ApiError extends Error {
    constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;
        this.isOperational = true;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    static badRequest(msg = 'Bad Request', errors = []) {
        return new ApiError(400, msg, errors);
    }

    static unauthorized(msg = 'Unauthorized access') {
        return new ApiError(401, msg);
    }

    static forbidden(msg = 'Forbidden - insufficient permissions') {
        return new ApiError(403, msg);
    }

    static notFound(msg = 'Resource not found') {
        return new ApiError(404, msg);
    }

    static conflict(msg = 'Resource conflict') {
        return new ApiError(409, msg);
    }

    static internal(msg = 'Internal Server Error', errors = []) {
        return new ApiError(500, msg, errors);
    }
}

export default ApiError;
