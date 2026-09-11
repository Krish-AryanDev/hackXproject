import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import * as reviewService from './review.service.js';

export const createReview = asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.user.id, req.body);
    return sendCreated(res, review, 'Review submitted successfully');
});

export const getProfileReviews = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const reviews = await reviewService.getProfileReviews(profileId);
    return sendSuccess(res, reviews, 'User reviews retrieved successfully');
});

export const getBookingReviews = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const reviews = await reviewService.getBookingReviews(bookingId);
    return sendSuccess(res, reviews, 'Booking reviews retrieved successfully');
});
