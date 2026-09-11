import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import {
    requestPhoneOtp,
    registerUser,
    loginUser,
    verifyOtpUnified,
    getUserProfile,
    updateUserProfile,
} from './auth.service.js';

/**
 * Request Phone OTP for Login or Signup
 * POST /api/v1/auth/send-otp
 */
export const sendOtpHandler = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await requestPhoneOtp(phone);
    return sendSuccess(res, result, result.message);
});

/**
 * Register New User
 * POST /api/v1/auth/register
 */
export const registerHandler = asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    return sendCreated(res, result, 'User registered successfully');
});

/**
 * Log In Existing User
 * POST /api/v1/auth/login
 */
export const loginHandler = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await loginUser(phone, otp);
    return sendSuccess(res, result, 'Login successful');
});

/**
 * Unified OTP Verification (handles both login and on-the-fly registration)
 * POST /api/v1/auth/verify-otp
 */
export const verifyOtpHandler = asyncHandler(async (req, res) => {
    const result = await verifyOtpUnified(req.body);
    const msg = result.isNewUser ? 'User registered and authenticated' : 'Login successful';
    return sendSuccess(res, result, msg);
});

/**
 * Get Current Authenticated Profile
 * GET /api/v1/auth/me
 */
export const getMeHandler = asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.user.id);
    return sendSuccess(res, profile, 'Current user profile fetched');
});

/**
 * Update Profile Details
 * PATCH /api/v1/auth/profile
 */
export const updateProfileHandler = asyncHandler(async (req, res) => {
    const updated = await updateUserProfile(req.user.id, req.body);
    return sendSuccess(res, updated, 'Profile updated successfully');
});
