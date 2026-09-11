import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import {
    sendPhoneOtp,
    verifyPhoneOtp,
    getUserProfile,
    updateUserProfile,
} from './auth.service.js';

/**
 * Request SMS OTP
 * POST /api/v1/auth/send-otp
 */
export const sendOtpHandler = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await sendPhoneOtp(phone);
    return sendSuccess(res, result, 'OTP sent successfully');
});

/**
 * Verify SMS OTP and Log In / Register
 * POST /api/v1/auth/verify-otp
 */
export const verifyOtpHandler = asyncHandler(async (req, res) => {
    const { phone, token, role, fullName, companyName } = req.body;
    const result = await verifyPhoneOtp(phone, token, role, fullName, companyName);
    const message = result.isNewUser ? 'User registered and authenticated successfully' : 'Login successful';
    return sendSuccess(res, result, message);
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
