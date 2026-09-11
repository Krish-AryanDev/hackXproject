import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';

/**
 * Submit a Verified Post-Delivery Review & Rating
 */
export const createReview = async (reviewerId, reviewData) => {
    const bookingId = reviewData.bookingId || reviewData.booking_id;
    const revieweeId = reviewData.revieweeId || reviewData.reviewee_id;
    const rating = reviewData.rating;
    const comment = reviewData.comment;

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        throw new ApiError(400, 'Rating must be an integer between 1 and 5');
    }

    if (!bookingId || !revieweeId) {
        throw new ApiError(400, 'Booking ID and Reviewee ID are required');
    }

    if (reviewerId === revieweeId) {
        throw new ApiError(400, 'You cannot review yourself');
    }

    // 1. Fetch booking and associated trip
    const { data: booking, error: bErr } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            id,
            status,
            business_id,
            trip:trips(driver_id, owner_id)
        `)
        .eq('id', bookingId)
        .single();

    if (bErr || !booking) {
        throw new ApiError(404, 'Booking not found');
    }

    if (booking.status !== 'delivered') {
        throw new ApiError(400, `Reviews can only be submitted after successful delivery (current status: ${booking.status})`);
    }

    // 2. Validate parties involved
    const isShipper = booking.business_id === reviewerId;
    const isCarrier = booking.trip?.driver_id === reviewerId || booking.trip?.owner_id === reviewerId;

    if (!isShipper && !isCarrier) {
        throw new ApiError(403, 'Unauthorized: Only parties involved in this shipment can submit a review');
    }

    const isValidReviewee = isShipper
        ? (revieweeId === booking.trip?.driver_id || revieweeId === booking.trip?.owner_id)
        : (revieweeId === booking.business_id);

    if (!isValidReviewee) {
        throw new ApiError(400, 'Reviewee is not a counterparty for this booking');
    }

    // 3. Check for existing review
    const { data: existingReview } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewerId)
        .eq('reviewee_id', revieweeId)
        .single();

    if (existingReview) {
        throw new ApiError(400, 'You have already submitted a review for this counterparty on this shipment');
    }

    // 4. Insert Review
    const { data: newReview, error: insertErr } = await supabaseAdmin
        .from('reviews')
        .insert({
            booking_id: bookingId,
            reviewer_id: reviewerId,
            reviewee_id: revieweeId,
            rating: ratingNum,
            comment: comment ? comment.trim() : null
        })
        .select()
        .single();

    if (insertErr) {
        throw new ApiError(500, `Failed to save review: ${insertErr.message}`);
    }

    // 5. Recalculate reviewee average rating & count
    const { data: userReviews, error: calcErr } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

    if (!calcErr && userReviews && userReviews.length > 0) {
        const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = Number((totalRating / userReviews.length).toFixed(2));
        const count = userReviews.length;

        await supabaseAdmin
            .from('profiles')
            .update({
                rating_avg: avgRating,
                rating_count: count,
                updated_at: new Date().toISOString()
            })
            .eq('id', revieweeId);
    }

    return newReview;
};

/**
 * Get all reviews received by a profile
 */
export const getProfileReviews = async (profileId) => {
    const { data: reviews, error } = await supabaseAdmin
        .from('reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            booking_id,
            reviewer:profiles!reviews_reviewer_id_fkey(
                id,
                full_name,
                company_name,
                role,
                profile_photo_url
            )
        `)
        .eq('reviewee_id', profileId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new ApiError(500, `Failed to load reviews: ${error.message}`);
    }

    return reviews;
};

/**
 * Get all reviews for a booking
 */
export const getBookingReviews = async (bookingId) => {
    const { data: reviews, error } = await supabaseAdmin
        .from('reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer_id,
            reviewee_id,
            reviewer:profiles!reviews_reviewer_id_fkey(full_name, role),
            reviewee:profiles!reviews_reviewee_id_fkey(full_name, role)
        `)
        .eq('booking_id', bookingId);

    if (error) {
        throw new ApiError(500, `Failed to load booking reviews: ${error.message}`);
    }

    return reviews;
};
