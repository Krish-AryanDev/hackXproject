import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js';
import * as analyticsController from './analytics.controller.js';

const router = Router();

// Platform wide aggregated green & economic metrics (public / dashboard banner)
router.get('/platform', analyticsController.getPlatformOverview);

// User-specific personalized green score & savings (Shipper / Carrier / Driver)
router.get('/me', authenticateUser, analyticsController.getMyAnalytics);

// Specific Trip breakdown & CO2 savings
router.get('/trips/:tripId', authenticateUser, analyticsController.getTripAnalytics);

export default router;
