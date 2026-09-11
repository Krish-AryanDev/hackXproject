import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import {
    createBooking,
    respondToBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getDriverDispatches,
    getOwnerPendingBookings,
} from './booking.service.js';

/**
 * Shipper Creates a Booking Request
 * POST /api/v1/bookings
 */
export const createBookingHandler = asyncHandler(async (req, res) => {
    const booking = await createBooking(req.user.id, req.body);
    return sendCreated(res, booking, 'Booking request submitted successfully. Awaiting vehicle owner approval.');
});

/**
 * Vehicle Owner Approves or Rejects Booking Request
 * PATCH /api/v1/bookings/:id/respond
 */
export const respondToBookingHandler = asyncHandler(async (req, res) => {
    const { action, rejection_reason } = req.body;
    const result = await respondToBooking(req.params.id, req.user.id, action, rejection_reason);
    return sendSuccess(res, result.booking, result.message);
});

/**
 * Get User's Bookings (Business, Owner, or Driver)
 * GET /api/v1/bookings/my-bookings
 */
export const getMyBookingsHandler = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const bookings = await getMyBookings(req.user.id, req.user.role, status);
    return sendSuccess(res, bookings, 'Bookings retrieved successfully');
});

/**
 * Get Booking Details by ID
 * GET /api/v1/bookings/:id
 */
export const getBookingDetailsHandler = asyncHandler(async (req, res) => {
    const booking = await getBookingById(req.params.id, req.user.id, req.user.role);
    return sendSuccess(res, booking, 'Booking details fetched');
});

/**
 * Shipper Cancels Booking
 * PATCH /api/v1/bookings/:id/cancel
 */
export const cancelBookingHandler = asyncHandler(async (req, res) => {
    const cancelled = await cancelBooking(req.params.id, req.user.id);
    return sendSuccess(res, cancelled, 'Booking cancelled successfully');
});

/**
 * Driver Dispatches List
 * GET /api/v1/bookings/driver/dispatches
 */
export const getDriverDispatchesHandler = asyncHandler(async (req, res) => {
    const dispatches = await getDriverDispatches(req.user.id);
    return sendSuccess(res, dispatches, 'Active driver dispatches retrieved');
});

/**
 * Get Pending Approval Requests for Vehicle Owner
 * GET /api/v1/bookings/owner-pending
 */
export const getOwnerPendingBookingsHandler = asyncHandler(async (req, res) => {
    // Check owner ID from authenticated user or fallback owner Kshitij Chaubey
    const ownerId = req.query.owner_id || req.user?.id || '1b64cd92-c141-4d2c-b029-b6f81b4bb5cd';
    const pending = await getOwnerPendingBookings(ownerId);
    return sendSuccess(res, pending, 'Owner pending booking approvals retrieved successfully');
});
