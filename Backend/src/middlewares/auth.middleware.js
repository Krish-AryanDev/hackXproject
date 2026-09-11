import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../db/db.js';
import { ApiError } from '../utils/apiError.util.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import env from '../config/env.js';

/**
 * Authentication Middleware
 * Validates mandatory Bearer JWT token and attaches user profile to req.user
 */
export const authenticateUser = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Authentication token is required (Header: Authorization: Bearer <token>)');
    }

    const token = authHeader.split(' ')[1];

    let decoded = null;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw ApiError.unauthorized('Authentication token has expired. Please log in again.');
        }
        throw ApiError.unauthorized('Invalid authentication token');
    }

    if (!decoded || !decoded.id) {
        throw ApiError.unauthorized('Invalid token payload');
    }

    // Fetch user profile from database
    let profile = null;
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', decoded.id)
        .maybeSingle();

    if (error || !data) {
        if (env.NODE_ENV === 'development') {
            const { devProfilesStore } = await import('../modules/auth/auth.service.js');
            profile = devProfilesStore.get(decoded.id) || devProfilesStore.get(decoded.phone);
        }
        if (!profile) {
            throw ApiError.unauthorized('User profile not found or inactive');
        }
    } else {
        profile = data;
    }


    req.user = profile;
    req.token = token;

    next();
});

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles - e.g. 'owner', 'driver', 'business', 'admin'
 */
export const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('User must be authenticated'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                ApiError.forbidden(
                    `Access restricted: requires one of [${allowedRoles.join(', ')}], current role is '${req.user.role}'`
                )
            );
        }

        next();
    };
};

export default {
    authenticateUser,
    requireRoles,
};
