import { ApiError } from '../utils/apiError.util.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Authentication & Authorization Middleware Skeleton (To be populated in Phase 2)
 */

export const authenticateUser = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback for Phase 1 testing if no token passed
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];
    // JWT / Supabase Auth verification will be integrated in Phase 2
    req.token = token;
    next();
});

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - e.g. 'owner', 'driver', 'business', 'admin'
 */
export const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return next(ApiError.forbidden('You do not have permission to perform this action'));
        }
        next();
    };
};

export default {
    authenticateUser,
    requireRoles,
};
