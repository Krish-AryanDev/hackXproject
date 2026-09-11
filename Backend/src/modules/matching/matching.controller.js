import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { searchMatchingTrips, checkDirectCompatibility } from './matching.service.js';

/**
 * Search Compatible Return Trucks Along Corridor
 * POST /api/v1/matching/search
 */
export const searchMatchingTripsHandler = asyncHandler(async (req, res) => {
    const results = await searchMatchingTrips(req.body);
    return sendSuccess(res, results, `Found ${results.matches_found} matching return trip(s)`);
});

/**
 * Standalone AI Cargo Compatibility Check
 * POST /api/v1/matching/check-compatibility
 */
export const checkCompatibilityHandler = asyncHandler(async (req, res) => {
    const { existingCargo, newCargo } = req.body;
    const result = await checkDirectCompatibility(existingCargo, newCargo);
    return sendSuccess(res, result, 'Cargo compatibility evaluated by AI');
});
