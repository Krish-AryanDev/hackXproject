import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../db/db.js';
import { ApiError } from '../utils/apiError.util.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import env from '../config/env.js';

/**
 * Authentication Middleware
 * Supports both Backend Signed JWT tokens and Supabase Auth session tokens
 */
export const authenticateUser = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Authentication token is required (Bearer <token>)');
    }

    const token = authHeader.split(' ')[1];

    // 1. Try Backend Native JWT Verification
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (decoded?.id) {
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', decoded.id)
                .maybeSingle();

            if (profile) {
                req.user = profile;
                req.token = token;
                return next();
            }
        }
    } catch (jwtErr) {
        // Not a backend local JWT, try Supabase Auth Session Token
    }

    // 2. Try Supabase Auth Session Token Verification
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
        throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    // Fetch corresponding profile
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (profileError || !profile) {
        throw ApiError.unauthorized('User profile not found in system');
    }

    req.user = profile;
    req.authUser = authData.user;
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
