import { Router } from 'express';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware.js';
import * as podController from './pod.controller.js';

const router = Router();

// All POD routes require authentication
router.use(authenticateUser);

// Driver & Owner trip status transitions (scheduled -> in_transit -> completed)
router.patch(
    '/trips/:tripId/status',
    requireRoles('driver', 'owner', 'admin'),
    podController.updateTripStatus
);

// Driver & Owner shipment booking status transitions (driver_dispatched -> in_transit)
router.patch(
    '/bookings/:bookingId/status',
    requireRoles('driver', 'owner', 'admin'),
    podController.updateBookingStatus
);

// Driver & Owner verifies OTP and marks delivered (digital POD)
router.post(
    '/bookings/:bookingId/verify-otp',
    requireRoles('driver', 'owner', 'admin'),
    podController.verifyPodAndDeliver
);

// View POD document (Shipper, Driver, or Owner)
router.get(
    '/bookings/:bookingId',
    podController.getPodDetails
);

export default router;
