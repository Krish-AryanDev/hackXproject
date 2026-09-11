import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';
import { calculateHaversineDistance, evaluateRouteCorridorMatch } from '../../utils/distance.util.js';
import { evaluateCargoCompatibility } from '../matching/aiCompatibility.service.js';

/**
 * Generate a 6-digit numeric OTP for Proof of Delivery (POD)
 */
const generatePodOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Shipper creates and submits a booking request for a return trip
 */
export const createBooking = async (businessId, data) => {
    const {
        trip_id,
        cargo_title,
        cargo_category = 'General Freight',
        cargo_description = '',
        weight_tons,
        volume_cft,
        pickup_address,
        pickup_lat,
        pickup_lng,
        pickup_deadline,
        drop_address,
        drop_lat,
        drop_lng,
        drop_deadline,
    } = data;

    // Validate required fields
    if (!trip_id) throw ApiError.badRequest('Trip ID is required');
    if (!cargo_title) throw ApiError.badRequest('Cargo title is required');
    if (!weight_tons || parseFloat(weight_tons) <= 0) {
        throw ApiError.badRequest('A positive weight in tons is required');
    }
    if (!pickup_address || pickup_lat === undefined || pickup_lng === undefined) {
        throw ApiError.badRequest('Valid pickup address and coordinates are required');
    }
    if (!drop_address || drop_lat === undefined || drop_lng === undefined) {
        throw ApiError.badRequest('Valid drop address and coordinates are required');
    }

    const requestedWeight = parseFloat(weight_tons);

    // 1. Fetch trip and check remaining capacity
    const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone)
        `)
        .eq('id', trip_id)
        .single();

    if (tripError || !trip) {
        throw ApiError.notFound('Return trip not found');
    }

    if (trip.status !== 'scheduled' && trip.status !== 'active') {
        throw ApiError.badRequest(`Cannot book a trip with status '${trip.status}'`);
    }

    if (parseFloat(trip.available_capacity_tons) < requestedWeight) {
        throw ApiError.badRequest(
            `Insufficient available capacity. Requested: ${requestedWeight} tons, Available: ${trip.available_capacity_tons} tons`
        );
    }

    // 2. Evaluate Geospatial Corridor Detour
    const pickupCoords = { lat: parseFloat(pickup_lat), lng: parseFloat(pickup_lng) };
    const dropCoords = { lat: parseFloat(drop_lat), lng: parseFloat(drop_lng) };
    const corridorMatch = evaluateRouteCorridorMatch(pickupCoords, dropCoords, trip, 50);

    const directDistanceKm = calculateHaversineDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        dropCoords.lat,
        dropCoords.lng
    );

    const estimatedDistanceKm = corridorMatch.shipmentDistanceKm || directDistanceKm;

    // 3. Evaluate AI Cargo Compatibility with Groq LLM (openai/gpt-oss-120b)
    const existingCargo = {
        category: trip.existing_cargo_category,
        description: trip.existing_cargo_description,
    };
    const newCargo = {
        category: cargo_category,
        description: `${cargo_title}. ${cargo_description}`,
        weight_tons: requestedWeight,
    };

    const aiReport = await evaluateCargoCompatibility(existingCargo, newCargo);

    // 4. Calculate Transparent Pricing
    const baseRate = parseFloat(trip.base_price_per_km_ton || 5.0);
    const discountFactor = 0.85; // 15% discount for empty return trips
    const calculatedPrice = Math.round(estimatedDistanceKm * requestedWeight * baseRate * discountFactor);

    const podOtp = generatePodOtp();

    // 5. Determine initial booking state based on AI verdict
    let initialStatus = 'pending_owner_approval';
    if (!aiReport.is_compatible || aiReport.safety_level === 'HAZARDOUS') {
        initialStatus = 'rejected';
    }

    // 6. Save Shipment Request into database
    const { data: booking, error: insertError } = await supabaseAdmin
        .from('shipment_requests')
        .insert([
            {
                business_id: businessId,
                trip_id,
                cargo_title: cargo_title.trim(),
                cargo_category: cargo_category.trim(),
                cargo_description: cargo_description ? cargo_description.trim() : null,
                weight_tons: requestedWeight,
                volume_cft: volume_cft ? parseFloat(volume_cft) : null,
                pickup_address,
                pickup_lat: parseFloat(pickup_lat),
                pickup_lng: parseFloat(pickup_lng),
                pickup_deadline: pickup_deadline || null,
                drop_address,
                drop_lat: parseFloat(drop_lat),
                drop_lng: parseFloat(drop_lng),
                drop_deadline: drop_deadline || null,
                estimated_distance_km: parseFloat(estimatedDistanceKm.toFixed(2)),
                price_calculated: calculatedPrice,
                ai_compatibility_score: aiReport.compatibility_score,
                ai_compatibility_verdict: aiReport.safety_level,
                ai_compatibility_reason: aiReport.reasoning,
                ai_handling_instructions: aiReport.special_handling_instructions,
                ai_evaluated_at: new Date().toISOString(),
                status: initialStatus,
                pod_otp: podOtp,
                owner_rejection_reason: initialStatus === 'rejected' ? 'Automatically rejected due to hazardous cargo incompatibility' : null,
            },
        ])
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name),
            trip:trips(
                id, origin_name, destination_name, departure_time, estimated_arrival_time,
                vehicle:vehicles(id, registration_number, vehicle_type, model_name),
                driver:profiles!trips_driver_id_fkey(id, full_name, phone),
                owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
            )
        `)
        .single();

    if (insertError) {
        throw ApiError.internal(`Failed to submit booking request: ${insertError.message}`);
    }

    if (initialStatus === 'rejected') {
        throw ApiError.badRequest(
            `Cargo Co-Loading Safety Warning: ${aiReport.reasoning}`,
            aiReport.hazards_identified
        );
    }

    return booking;
};

/**
 * Vehicle Owner approves or rejects a pending booking request
 */
export const respondToBooking = async (bookingId, ownerId, action, rejectionReason = '') => {
    if (!['approve', 'reject'].includes(action)) {
        throw ApiError.badRequest('Action must be either "approve" or "reject"');
    }

    // 1. Fetch booking and trip details
    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            *,
            trip:trips(id, owner_id, current_loaded_tons, total_capacity_tons, available_capacity_tons, status)
        `)
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) {
        throw ApiError.notFound('Booking request not found');
    }

    // Verify ownership
    if (booking.trip?.owner_id !== ownerId) {
        throw ApiError.forbidden('You can only approve or reject bookings for your own vehicles');
    }

    if (booking.status !== 'pending_owner_approval') {
        throw ApiError.badRequest(`Cannot respond to a booking in '${booking.status}' status`);
    }

    if (action === 'reject') {
        const { data: rejected, error: rejectErr } = await supabaseAdmin
            .from('shipment_requests')
            .update({
                status: 'rejected',
                owner_rejection_reason: rejectionReason || 'Declined by carrier',
                updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (rejectErr) throw ApiError.internal(`Failed to reject booking: ${rejectErr.message}`);
        return { booking: rejected, message: 'Booking request rejected by owner' };
    }

    // --- APPROVAL FLOW ---
    const currentLoaded = parseFloat(booking.trip.current_loaded_tons || 0);
    const bookingWeight = parseFloat(booking.weight_tons);
    const newLoadedTons = currentLoaded + bookingWeight;

    if (newLoadedTons > parseFloat(booking.trip.total_capacity_tons)) {
        throw ApiError.badRequest('Cannot approve: adding this shipment exceeds the maximum truck capacity');
    }

    // Update trip loaded capacity & status upon approval (automatically removes from available marketplace)
    const isFullyBooked = newLoadedTons >= parseFloat(booking.trip.total_capacity_tons);
    const { error: tripUpdateErr } = await supabaseAdmin
        .from('trips')
        .update({
            current_loaded_tons: newLoadedTons,
            status: isFullyBooked ? 'completed' : 'active',
            available_capacity_tons: Math.max(0, parseFloat(booking.trip.total_capacity_tons) - newLoadedTons),
            updated_at: new Date().toISOString(),
        })
        .eq('id', booking.trip_id);

    if (tripUpdateErr) {
        throw ApiError.internal(`Failed to update trip capacity: ${tripUpdateErr.message}`);
    }

    // Transition booking status to 'driver_dispatched' (dispatches immediately to driver)
    const { data: approvedBooking, error: bookingUpdateErr } = await supabaseAdmin
        .from('shipment_requests')
        .update({
            status: 'driver_dispatched',
            updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name),
            trip:trips(
                id, origin_name, destination_name, available_capacity_tons, current_loaded_tons, status,
                driver:profiles!trips_driver_id_fkey(id, full_name, phone),
                vehicle:vehicles(registration_number, vehicle_type, model_name)
            )
        `)
        .single();

    if (bookingUpdateErr) {
        throw ApiError.internal(`Failed to approve booking: ${bookingUpdateErr.message}`);
    }

    return {
        booking: approvedBooking,
        message: 'Booking approved by owner! Trip removed from available pool and dispatched to driver.',
    };
};

/**
 * Get all pending booking approval requests specifically for the vehicle owner's own vehicles
 */
export const getOwnerPendingBookings = async (ownerId) => {
    if (!ownerId) {
        return [];
    }

    // 1. Fetch all vehicles owned by this specific owner
    const { data: ownedVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('owner_id', ownerId);

    const ownedVehicleIds = (ownedVehicles || []).map((v) => v.id);

    // 2. Fetch all trips where owner_id is this user OR vehicle_id is in their owned vehicles
    let tripQuery = supabaseAdmin.from('trips').select('id');
    if (ownedVehicleIds.length > 0) {
        tripQuery = tripQuery.or(`owner_id.eq.${ownerId},vehicle_id.in.(${ownedVehicleIds.join(',')})`);
    } else {
        tripQuery = tripQuery.eq('owner_id', ownerId);
    }

    const { data: ownerTrips, error: tripErr } = await tripQuery;

    if (tripErr || !ownerTrips || ownerTrips.length === 0) {
        return [];
    }

    const tripIds = ownerTrips.map((t) => t.id);

    // 3. Fetch pending booking requests strictly for these owned trips & vehicles
    const { data: pendingRequests, error } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name),
            trip:trips(
                id, origin_name, destination_name, available_capacity_tons, current_loaded_tons, status, owner_id,
                vehicle:vehicles(id, registration_number, vehicle_type, model_name, owner_id),
                driver:profiles!trips_driver_id_fkey(id, full_name, phone),
                owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
            )
        `)
        .in('trip_id', tripIds)
        .eq('status', 'pending_owner_approval')
        .order('created_at', { ascending: false });

    if (error) {
        throw ApiError.internal(`Failed to fetch owner pending requests: ${error.message}`);
    }

    return pendingRequests || [];
};

/**
 * Get all bookings for the authenticated user based on role
 */
export const getMyBookings = async (userId, userRole, statusFilter) => {
    let query = supabaseAdmin
        .from('shipment_requests')
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name),
            trip:trips(
                id, origin_name, destination_name, departure_time, estimated_arrival_time, status, owner_id,
                vehicle:vehicles(id, registration_number, vehicle_type, model_name),
                driver:profiles!trips_driver_id_fkey(id, full_name, phone),
                owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
            )
        `);

    if (userRole === 'business') {
        // Business shipper only sees their own booked shipments
        query = query.eq('business_id', userId);
    } else if (userRole === 'owner') {
        // Owner only sees requests for their own vehicles
        query = query.filter('trip.owner_id', 'eq', userId);
    } else if (userRole === 'driver') {
        // Driver only sees requests assigned to their vehicle
        query = query.filter('trip.driver_id', 'eq', userId);
    }

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        throw ApiError.internal(`Failed to fetch bookings: ${error.message}`);
    }

    return data || [];
};

/**
 * Get single booking details
 */
export const getBookingById = async (bookingId, userId, userRole) => {
    const { data: booking, error } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name, rating_avg),
            trip:trips(
                id, origin_name, destination_name, departure_time, estimated_arrival_time, status,
                vehicle:vehicles(id, registration_number, vehicle_type, model_name),
                driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg),
                owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name, rating_avg)
            )
        `)
        .eq('id', bookingId)
        .single();

    if (error || !booking) {
        throw ApiError.notFound('Booking not found');
    }

    // Access control
    if (
        userRole !== 'admin' &&
        booking.business_id !== userId &&
        booking.trip?.owner_id !== userId &&
        booking.trip?.driver_id !== userId
    ) {
        throw ApiError.forbidden('You are not authorized to view this booking');
    }

    return booking;
};

/**
 * Shipper cancels booking if not yet picked up
 */
export const cancelBooking = async (bookingId, businessId) => {
    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('shipment_requests')
        .select('id, business_id, status, trip_id, weight_tons')
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) {
        throw ApiError.notFound('Booking not found');
    }

    if (booking.business_id !== businessId) {
        throw ApiError.forbidden('You can only cancel your own bookings');
    }

    const cancellableStatuses = ['pending_ai', 'pending_owner_approval', 'approved', 'driver_dispatched'];
    if (!cancellableStatuses.includes(booking.status)) {
        throw ApiError.badRequest(`Cannot cancel booking in '${booking.status}' status`);
    }

    // If already approved/dispatched, restore the trip's available capacity
    if (booking.status === 'approved' || booking.status === 'driver_dispatched') {
        const { data: trip } = await supabaseAdmin
            .from('trips')
            .select('current_loaded_tons')
            .eq('id', booking.trip_id)
            .single();

        if (trip) {
            const newLoaded = Math.max(0, parseFloat(trip.current_loaded_tons) - parseFloat(booking.weight_tons));
            await supabaseAdmin
                .from('trips')
                .update({ current_loaded_tons: newLoaded, updated_at: new Date().toISOString() })
                .eq('id', booking.trip_id);
        }
    }

    const { data: cancelled, error } = await supabaseAdmin
        .from('shipment_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .single();

    if (error) {
        throw ApiError.internal(`Failed to cancel booking: ${error.message}`);
    }

    return cancelled;
};

/**
 * Driver accesses their active dispatched shipments with waypoint instructions
 */
export const getDriverDispatches = async (driverId) => {
    const { data, error } = await supabaseAdmin
        .from('shipment_requests')
        .select(`
            *,
            business:profiles!shipment_requests_business_id_fkey(id, full_name, phone, company_name),
            trip:trips!inner(
                id, origin_name, destination_name, departure_time, estimated_arrival_time, driver_id, status,
                vehicle:vehicles(registration_number, vehicle_type, model_name)
            )
        `)
        .eq('trip.driver_id', driverId)
        .in('status', ['driver_dispatched', 'in_transit'])
        .order('created_at', { ascending: true });

    if (error) {
        throw ApiError.internal(`Failed to fetch driver dispatches: ${error.message}`);
    }

    return data || [];
};

export default {
    createBooking,
    respondToBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    getDriverDispatches,
};
