import { ApiError } from '../utils/apiError.util.js';

/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res, next) => {
    next(ApiError.notFound(`Cannot find route: ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
