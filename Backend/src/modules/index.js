/**
 * Modules Registry & Route Aggregator
 */
import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import vehicleRoutes from './vehicles/vehicle.routes.js';
import tripRoutes from './trips/trip.routes.js';
import matchingRoutes from './matching/matching.routes.js';
import bookingRoutes from './bookings/booking.routes.js';

import podRoutes from './pod/pod.routes.js';
import analyticsRoutes from './analytics/analytics.routes.js';
import reviewRoutes from './reviews/review.routes.js';

const apiRouter = Router();

// Mounted Modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/trips', tripRoutes);
apiRouter.use('/matching', matchingRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/pod', podRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/reviews', reviewRoutes);

export default apiRouter;
