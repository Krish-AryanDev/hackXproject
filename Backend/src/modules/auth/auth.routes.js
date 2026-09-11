import { Router } from 'express';
import {
    sendOtpHandler,
    verifyOtpHandler,
    getMeHandler,
    updateProfileHandler,
} from './auth.controller.js';
import { authenticateUser } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public Auth Endpoints
router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);

// Protected Auth Endpoints
router.get('/me', authenticateUser, getMeHandler);
router.patch('/profile', authenticateUser, updateProfileHandler);

export default router;
