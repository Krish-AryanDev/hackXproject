import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import * as podService from './pod.service.js';

export const updateTripStatus = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { status } = req.body;
    const updatedTrip = await podService.updateTripStatus(req.user.id, req.user.role, tripId, status);
    return sendSuccess(res, updatedTrip, `Trip status updated to ${status} successfully`);
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;
    const updatedBooking = await podService.updateBookingStatus(req.user.id, req.user.role, bookingId, status);
    return sendSuccess(res, updatedBooking, `Booking status updated to ${status} successfully`);
});

export const verifyPodAndDeliver = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const podData = req.body; // { podOtp, receiverName, signatureUrl, photoUrl }
    const result = await podService.verifyPodAndDeliver(req.user.id, req.user.role, bookingId, podData);
    return sendSuccess(res, result, 'Proof of Delivery verified and delivery marked as completed!');
});

export const getPodDetails = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const podDetails = await podService.getPodDetails(req.user.id, req.user.role, bookingId);
    return sendSuccess(res, podDetails, 'POD details retrieved successfully');
});
