import { Router } from 'express';
import {
    createBookingHandler,
    respondToBookingHandler,
    getMyBookingsHandler,
    getBookingDetailsHandler,
    cancelBookingHandler,
    getDriverDispatchesHandler,
    getOwnerPendingBookingsHandler,
} from './booking.controller.js';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all booking routes with mandatory Bearer JWT
router.use(authenticateUser);

// 1. Shipper / Business Creates Booking
router.post('/', requireRoles('business', 'admin'), createBookingHandler);

// 2. User Bookings (Business, Owner, or Driver)
router.get('/my-bookings', getMyBookingsHandler);

// 3. Owner Pending Approval Requests (Owner only)
router.get('/owner-pending', getOwnerPendingBookingsHandler);

// 4. Driver Dispatches (Driver only)
router.get('/driver/dispatches', requireRoles('driver', 'admin'), getDriverDispatchesHandler);

// 5. Booking Details
router.get('/:id', getBookingDetailsHandler);

// 6. Owner Approves or Rejects Booking
router.patch('/:id/respond', respondToBookingHandler);
router.post('/:id/respond', respondToBookingHandler);

// 7. Shipper Cancels Booking
router.patch('/:id/cancel', requireRoles('business', 'admin'), cancelBookingHandler);

export default router;
