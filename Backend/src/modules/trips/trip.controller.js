import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.util.js';
import {
    createTrip,
    getTrips,
    getTripById,
    getMyTrips,
    updateTripStatus,
    autoCreateReturnTripOnProximity,
} from './trip.service.js';

/**
 * Publish Return Trip
 * POST /api/v1/trips
 */
export const createTripHandler = asyncHandler(async (req, res) => {
    const trip = await createTrip(req.user.id, req.body);
    return sendCreated(res, trip, 'Return trip published successfully');
});

/**
 * Search & List Active Trips
 * GET /api/v1/trips
 */
export const getTripsHandler = asyncHandler(async (req, res) => {
    const { items, pagination } = await getTrips(req.query);
    return sendPaginated(res, items, pagination, 'Trips retrieved successfully');
});

/**
 * Get Trip by ID
 * GET /api/v1/trips/:id
 */
export const getTripDetailsHandler = asyncHandler(async (req, res) => {
    const trip = await getTripById(req.params.id);
    return sendSuccess(res, trip, 'Trip details fetched');
});

/**
 * Get Trips for Logged-In User (Owner or Driver)
 * GET /api/v1/trips/user/my-trips
 */
export const getMyTripsHandler = asyncHandler(async (req, res) => {
    const trips = await getMyTrips(req.user.id, req.user.role);
    return sendSuccess(res, trips, 'User trips fetched successfully');
});

/**
 * Update Trip Status
 * PATCH /api/v1/trips/:id/status
 */
export const updateTripStatusHandler = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const updated = await updateTripStatus(req.params.id, req.user.id, req.user.role, status);
    return sendSuccess(res, updated, `Trip status updated to ${status}`);
});

/**
 * Proximity Trigger (When truck is <= 10 km from destination)
 * POST /api/v1/trips/proximity-trigger
 */
export const autoCreateTripOnProximityHandler = asyncHandler(async (req, res) => {
    // req.user could be driver, owner, or fallback default driver
    const driverId = req.user?.id || 'f3ed29ca-ed5b-484a-ba1a-e358c3aa996c'; // Krish Aryan
    const result = await autoCreateReturnTripOnProximity(driverId, req.body);
    return sendCreated(res, result, result.message);
});
