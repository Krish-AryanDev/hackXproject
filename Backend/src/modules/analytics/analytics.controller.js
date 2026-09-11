import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import * as analyticsService from './analytics.service.js';

export const getPlatformOverview = asyncHandler(async (req, res) => {
    const data = await analyticsService.getPlatformOverview();
    return sendSuccess(res, data, 'Platform green metrics retrieved successfully');
});

export const getMyAnalytics = asyncHandler(async (req, res) => {
    const data = await analyticsService.getUserAnalytics(req.user.id, req.user.role);
    return sendSuccess(res, data, 'User analytics retrieved successfully');
});

export const getTripAnalytics = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const data = await analyticsService.getTripAnalytics(tripId);
    return sendSuccess(res, data, 'Trip analytics retrieved successfully');
});
