import { Router } from 'express';
import {
    sendOtpHandler,
    registerHandler,
    loginHandler,
    verifyOtpHandler,
    getMeHandler,
    updateProfileHandler,
} from './auth.controller.js';
import { authenticateUser } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/send-otp', sendOtpHandler);
router.post('/request-otp', sendOtpHandler); // Alias
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/verify-otp', verifyOtpHandler);

// Protected Authentication Endpoints (Require Bearer JWT)
router.get('/me', authenticateUser, getMeHandler);
router.get('/getme', authenticateUser, getMeHandler); // Alias for /getme requested by user
router.patch('/profile', authenticateUser, updateProfileHandler);

export default router;
