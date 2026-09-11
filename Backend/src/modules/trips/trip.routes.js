import { Router } from 'express';
import {
    createTripHandler,
    getTripsHandler,
    getTripDetailsHandler,
    getMyTripsHandler,
    updateTripStatusHandler,
} from './trip.controller.js';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public / Search endpoints
router.get('/', getTripsHandler);
router.get('/:id', getTripDetailsHandler);

// Protected endpoints
router.use(authenticateUser);

// Owner publishes return trips
router.post('/', requireRoles('owner', 'admin'), createTripHandler);

// Owner / Driver trips
router.get('/user/my-trips', requireRoles('owner', 'driver', 'admin'), getMyTripsHandler);

// Owner / Driver status updates
router.patch('/:id/status', requireRoles('owner', 'driver', 'admin'), updateTripStatusHandler);

export default router;
