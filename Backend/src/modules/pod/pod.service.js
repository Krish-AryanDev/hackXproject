import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';
import { calculateGreenMetrics } from '../../utils/emissions.util.js';

/**
 * Update Trip Execution Status (Driver or Owner)
 */
export const updateTripStatus = async (userId, userRole, tripId, newStatus) => {
    const validStatuses = ['scheduled', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new ApiError(400, `Invalid trip status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const { data: trip, error: fetchErr } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (fetchErr || !trip) {
        throw new ApiError(404, 'Trip not found');
    }

    // Check authorization: must be assigned driver or vehicle owner
    if (trip.driver_id !== userId && trip.owner_id !== userId) {
        throw new ApiError(403, 'Unauthorized: You are not assigned to this trip');
    }

    const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    if (newStatus === 'in_transit' && !trip.actual_departure_time) {
        updatePayload.actual_departure_time = new Date().toISOString();
    } else if (newStatus === 'completed' && !trip.actual_arrival_time) {
        updatePayload.actual_arrival_time = new Date().toISOString();
    }

    const { data: updatedTrip, error: updateErr } = await supabaseAdmin
        .from('trips')
        .update(updatePayload)
        .eq('id', tripId)
        .select()
        .single();

    if (updateErr) {
        throw new ApiError(500, `Failed to update trip status: ${updateErr.message}`);
    }

    return updatedTrip;
};

/**
 * Update Booking Status during trip execution
 */
export const updateBookingStatus = async (userId, userRole, bookingId, newStatus) => {
    const validStatuses = ['driver_dispatched', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new ApiError(400, `Invalid booking status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('shipment_requests')
        .select('*, trip:trips(*)')
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) {
        throw new ApiError(404, 'Booking request not found');
    }

    const trip = booking.trip;
    if (!trip) {
        throw new ApiError(400, 'Booking is not associated with an active trip');
    }

    // Check authorization: Driver or Owner
    if (trip.driver_id !== userId && trip.owner_id !== userId) {
        throw new ApiError(403, 'Unauthorized: Only the assigned driver or owner can update shipment transit state');
    }

    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
        .from('shipment_requests')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

    if (updateErr) {
        throw new ApiError(500, `Failed to update booking status: ${updateErr.message}`);
    }

    return updatedBooking;
};

/**
 * Verify Proof of Delivery (POD) via Receiver OTP and Complete Delivery
 */
export const verifyPodAndDeliver = async (userId, userRole, bookingId, podData) => {
    const podOtp = podData.podOtp || podData.pod_otp;
    const receiverName = podData.receiverName || podData.receiver_name;
    const signatureUrl = podData.signatureUrl || podData.signature_url;
    const photoUrl = podData.photoUrl || podData.photo_url;

    if (!podOtp) {
        throw new ApiError(400, 'Proof of Delivery OTP is required');
    }

    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('shipment_requests')
        .select('*, trip:trips(*)')
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) {
        throw new ApiError(404, 'Booking request not found');
    }

    const trip = booking.trip;
    if (!trip) {
        throw new ApiError(400, 'Booking is not associated with any trip');
    }

    // Authorization: Must be assigned driver or vehicle owner
    if (trip.driver_id !== userId && trip.owner_id !== userId) {
        throw new ApiError(403, 'Unauthorized: You are not assigned to deliver this shipment');
    }

    if (booking.status === 'delivered') {
        throw new ApiError(400, 'This shipment has already been verified and delivered');
    }

    if (!['driver_dispatched', 'in_transit'].includes(booking.status)) {
        throw new ApiError(400, `Cannot complete POD for a booking in '${booking.status}' status`);
    }

    // Validate OTP
    if (String(booking.pod_otp).trim() !== String(podOtp).trim()) {
        throw new ApiError(400, 'Invalid Proof of Delivery OTP. Please verify with the consignee/receiver.');
    }

    const completedAt = new Date().toISOString();

    // 1. Update Booking status to delivered
    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
        .from('shipment_requests')
        .update({
            status: 'delivered',
            pod_completed_at: completedAt,
            pod_receiver_name: receiverName || 'Authorized Consignee',
            pod_signature_url: signatureUrl || null,
            pod_photo_url: photoUrl || null,
            updated_at: completedAt
        })
        .eq('id', bookingId)
        .select()
        .single();

    if (updateErr) {
        throw new ApiError(500, `Failed to update delivery status: ${updateErr.message}`);
    }

    // 2. Compute Green Logistics Analytics & Financial Value
    const greenMetrics = calculateGreenMetrics({
        distanceKm: Number(booking.estimated_distance_km) || 0,
        weightTons: Number(booking.weight_tons) || 0,
        priceCalculated: Number(booking.price_calculated) || 0
    });

    // 3. Store in trip_analytics table
    const { data: analyticsRecord, error: analyticsErr } = await supabaseAdmin
        .from('trip_analytics')
        .insert({
            trip_id: booking.trip_id,
            booking_id: booking.id,
            empty_km_avoided: greenMetrics.empty_km_avoided,
            co2_kg_saved: greenMetrics.co2_kg_saved,
            carrier_earnings: greenMetrics.carrier_earnings,
            shipper_cost_saved: greenMetrics.shipper_cost_saved,
            created_at: completedAt
        })
        .select()
        .single();

    if (analyticsErr) {
        console.error('Warning: Failed to record trip analytics:', analyticsErr.message);
    }

    return {
        booking: updatedBooking,
        analytics: analyticsRecord || greenMetrics
    };
};

/**
 * Get Proof of Delivery Details for a Booking
 */
export const getPodDetails = async (userId, userRole, bookingId) => {
    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            id,
            cargo_title,
            cargo_category,
            weight_tons,
            pickup_address,
            drop_address,
            status,
            price_calculated,
            pod_otp,
            pod_completed_at,
            pod_receiver_name,
            pod_signature_url,
            pod_photo_url,
            business_id,
            trip:trips (
                id,
                origin_name,
                destination_name,
                driver_id,
                owner_id,
                vehicle:vehicles(registration_number, vehicle_type, model_name)
            )
        `)
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) {
        throw new ApiError(404, 'Booking not found');
    }

    // Check authorization: Shipper, Driver, or Owner
    const isShipper = booking.business_id === userId;
    const isDriver = booking.trip?.driver_id === userId;
    const isOwner = booking.trip?.owner_id === userId;

    if (!isShipper && !isDriver && !isOwner) {
        throw new ApiError(403, 'Unauthorized: Access to this POD document is restricted');
    }

    // Only shipper can see the OTP before delivery, driver/owner enters it from shipper
    const responsePayload = { ...booking };
    if (isDriver || (isOwner && !isShipper)) {
        if (booking.status !== 'delivered') {
            delete responsePayload.pod_otp; // Driver must ask receiver for the OTP
        }
    }

    return responsePayload;
};
