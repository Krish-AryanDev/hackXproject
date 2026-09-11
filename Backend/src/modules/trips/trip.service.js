import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';

const VALID_TRIP_STATUSES = ['scheduled', 'active', 'completed', 'cancelled'];

/**
 * Publish a new Return Leg Trip
 */
export const createTrip = async (ownerId, data) => {
    const {
        vehicle_id,
        driver_id,
        origin_name,
        origin_lat,
        origin_lng,
        destination_name,
        destination_lat,
        destination_lng,
        route_waypoints = [],
        departure_time,
        estimated_arrival_time,
        current_loaded_tons = 0,
        existing_cargo_category,
        existing_cargo_description,
        base_price_per_km_ton = 5.0,
    } = data;

    // Validate required fields
    if (!vehicle_id) throw ApiError.badRequest('Vehicle ID is required');
    if (!origin_name || origin_lat === undefined || origin_lng === undefined) {
        throw ApiError.badRequest('Valid origin name and coordinates (lat, lng) are required');
    }
    if (!destination_name || destination_lat === undefined || destination_lng === undefined) {
        throw ApiError.badRequest('Valid destination name and coordinates (lat, lng) are required');
    }
    if (!departure_time || !estimated_arrival_time) {
        throw ApiError.badRequest('Departure time and estimated arrival time are required');
    }

    // Verify vehicle & ownership
    const { data: vehicle, error: vehicleErr } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', vehicle_id)
        .single();

    if (vehicleErr || !vehicle) {
        throw ApiError.notFound('Vehicle not found');
    }
    if (vehicle.owner_id !== ownerId) {
        throw ApiError.forbidden('You do not own this vehicle');
    }
    if (!vehicle.is_active) {
        throw ApiError.badRequest('Cannot schedule a trip with an inactive vehicle');
    }

    // Resolve driver
    const selectedDriverId = driver_id || vehicle.assigned_driver_id;
    if (!selectedDriverId) {
        throw ApiError.badRequest('A driver must be assigned to this trip or vehicle');
    }

    // Verify driver exists
    const { data: driver } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('id', selectedDriverId)
        .maybeSingle();

    if (!driver || driver.role !== 'driver') {
        throw ApiError.badRequest('Selected driver is not a registered driver profile');
    }

    const totalCapacity = parseFloat(vehicle.max_weight_capacity_tons);
    const loadedTons = parseFloat(current_loaded_tons || 0);

    if (loadedTons > totalCapacity) {
        throw ApiError.badRequest(`Current loaded tons (${loadedTons}) cannot exceed vehicle capacity (${totalCapacity} tons)`);
    }

    const availableCapacity = totalCapacity - loadedTons;

    // Format waypoints JSON
    let formattedWaypoints = [];
    if (Array.isArray(route_waypoints)) {
        formattedWaypoints = route_waypoints.map((wp) => ({
            name: wp.name || 'Waypoint',
            lat: parseFloat(wp.lat),
            lng: parseFloat(wp.lng),
            eta: wp.eta || null,
        }));
    }

    const { data: trip, error } = await supabaseAdmin
        .from('trips')
        .insert([
            {
                owner_id: ownerId,
                vehicle_id,
                driver_id: selectedDriverId,
                origin_name,
                origin_lat: parseFloat(origin_lat),
                origin_lng: parseFloat(origin_lng),
                destination_name,
                destination_lat: parseFloat(destination_lat),
                destination_lng: parseFloat(destination_lng),
                route_waypoints: formattedWaypoints,
                departure_time,
                estimated_arrival_time,
                total_capacity_tons: totalCapacity,
                current_loaded_tons: loadedTons,
                available_capacity_tons: availableCapacity,
                existing_cargo_category: existing_cargo_category || null,
                existing_cargo_description: existing_cargo_description || null,
                base_price_per_km_ton: parseFloat(base_price_per_km_ton),
                status: 'scheduled',
            },
        ])
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
        `)
        .single();

    if (error) {
        throw ApiError.internal(`Failed to publish return trip: ${error.message}`);
    }

    return trip;
};

/**
 * List / search active return trips
 */
export const getTrips = async (filters = {}) => {
    const {
        origin,
        destination,
        minAvailableCapacity,
        status = 'scheduled',
        page = 1,
        limit = 20,
    } = filters;

    let query = supabaseAdmin
        .from('trips')
        .select(
            `
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
        `,
            { count: 'exact' }
        );

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (origin) {
        query = query.ilike('origin_name', `%${origin}%`);
    }
    if (destination) {
        query = query.ilike('destination_name', `%${destination}%`);
    }
    if (minAvailableCapacity) {
        query = query.gte('available_capacity_tons', parseFloat(minAvailableCapacity));
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.order('departure_time', { ascending: true }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw ApiError.internal(`Failed to fetch trips: ${error.message}`);
    }

    return {
        items: data || [],
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems: count || 0,
            totalPages: Math.ceil((count || 0) / limitNum),
            hasNextPage: to < (count || 0) - 1,
            hasPrevPage: pageNum > 1,
        },
    };
};

/**
 * Get Trip Details by ID
 */
export const getTripById = async (tripId) => {
    const { data, error } = await supabaseAdmin
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, max_weight_capacity_tons, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg, rating_count),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name, rating_avg)
        `)
        .eq('id', tripId)
        .single();

    if (error || !data) {
        throw ApiError.notFound('Trip not found');
    }

    return data;
};

/**
 * Get trips associated with current user (Owner or Driver)
 */
export const getMyTrips = async (userId, userRole) => {
    let query = supabaseAdmin.from('trips').select(`
        *,
        vehicle:vehicles(id, registration_number, vehicle_type, model_name),
        driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg),
        owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
    `);

    if (userRole === 'owner') {
        query = query.eq('owner_id', userId);
    } else if (userRole === 'driver') {
        query = query.eq('driver_id', userId);
    }

    query = query.order('departure_time', { ascending: false });

    const { data, error } = await query;

    if (error) {
        throw ApiError.internal(`Failed to fetch user trips: ${error.message}`);
    }

    return data || [];
};

/**
 * Update Trip Status
 */
export const updateTripStatus = async (tripId, userId, userRole, newStatus) => {
    if (!VALID_TRIP_STATUSES.includes(newStatus)) {
        throw ApiError.badRequest(`Invalid status. Allowed: ${VALID_TRIP_STATUSES.join(', ')}`);
    }

    const { data: trip, error: findError } = await supabaseAdmin
        .from('trips')
        .select('id, owner_id, driver_id, status')
        .eq('id', tripId)
        .single();

    if (findError || !trip) {
        throw ApiError.notFound('Trip not found');
    }

    // Only owner or assigned driver can update trip status
    if (userRole !== 'admin' && trip.owner_id !== userId && trip.driver_id !== userId) {
        throw ApiError.forbidden('You are not authorized to update this trip status');
    }

    const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
    };

    if (newStatus === 'active') {
        updates.actual_departure_time = new Date().toISOString();
    } else if (newStatus === 'completed') {
        updates.actual_arrival_time = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
        .from('trips')
        .update(updates)
        .eq('id', tripId)
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone)
        `)
        .single();

    if (error) {
        throw ApiError.internal(`Failed to update trip status: ${error.message}`);
    }

    return updated;
};

/**
 * Automatically creates a return trip in the database when the vehicle is within 10 km of destination
 * Populates all corridor points of load so shippers along the route can instantly discover and book it
 */
export const autoCreateReturnTripOnProximity = async (driverId, data) => {
    const {
        current_destination_name,
        current_lat,
        current_lng,
        return_destination_name,
        distance_to_dest_km,
        corridor_points_of_load = [],
        force_create = false,
    } = data;

    if (!force_create && distance_to_dest_km !== undefined && distance_to_dest_km > 10.5) {
        return {
            created: false,
            message: `Vehicle is ${distance_to_dest_km} km away. Proximity auto-creation triggers at <= 10 km.`,
        };
    }

    // 1. Resolve Driver and their Assigned Vehicle
    let { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('assigned_driver_id', driverId)
        .maybeSingle();

    if (!vehicle) {
        // Fallback: fetch active vehicle belonging to owner Kshitij Chaubey
        const { data: fallbackVehicle } = await supabaseAdmin
            .from('vehicles')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();
        vehicle = fallbackVehicle;
    }

    if (!vehicle) throw ApiError.notFound('No active commercial vehicle found for driver');

    const originName = current_destination_name || 'Lucknow, Uttar Pradesh';
    const destName = return_destination_name || 'Jaipur, Rajasthan';
    const originCityShort = originName.split(',')[0].trim();

    // 2. Check if an active/scheduled return trip from this location already exists to avoid duplication
    const { data: existingTrip } = await supabaseAdmin
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
        `)
        .eq('vehicle_id', vehicle.id)
        .in('status', ['scheduled', 'active'])
        .ilike('origin_name', `%${originCityShort}%`)
        .maybeSingle();

    if (existingTrip) {
        return {
            created: false,
            alreadyExists: true,
            trip: existingTrip,
            message: `Return trip for ${vehicle.model_name} starting at ${originCityShort} is already active in database with corridor points of load.`,
        };
    }

    // 3. Format Corridor Waypoints (Points of Load)
    const formattedWaypoints = corridor_points_of_load.map((p) => ({
        name: `${p.name} (${p.highway || 'Transit Hub'})`,
        lat: p.lat,
        lng: p.lng,
        distFromOriginKm: p.distFromOriginKm,
        detourKm: p.detourKm,
        eta: p.etaMins ? `~${Math.floor(p.etaMins / 60)}h ${p.etaMins % 60}m` : '1h 45m',
        estimatedEarnings: p.estimatedEarnings || '₹3,500',
    }));

    // Scheduled Departure (45 minutes from now)
    const depTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const arrTime = new Date(Date.now() + 7 * 3600 * 1000).toISOString();
    const totalCap = parseFloat(vehicle.max_weight_capacity_tons || 15);

    // 4. Create the return trip with 100% capacity available for co-loading
    const { data: newTrip, error: insertErr } = await supabaseAdmin
        .from('trips')
        .insert([
            {
                owner_id: vehicle.owner_id,
                vehicle_id: vehicle.id,
                driver_id: driverId || vehicle.assigned_driver_id,
                origin_name: originName,
                origin_lat: current_lat || 26.8467,
                origin_lng: current_lng || 80.9462,
                destination_name: destName,
                destination_lat: 26.9124,
                destination_lng: 75.7873,
                route_waypoints: formattedWaypoints,
                departure_time: depTime,
                estimated_arrival_time: arrTime,
                total_capacity_tons: totalCap,
                current_loaded_tons: 0,
                available_capacity_tons: totalCap,
                existing_cargo_category: 'empty',
                existing_cargo_description: 'Completely empty return leg - available for all corridor load pickups',
                base_price_per_km_ton: 1.7,
                status: 'scheduled',
            },
        ])
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name)
        `)
        .single();

    if (insertErr) {
        throw ApiError.internal(`Failed to auto-create return trip: ${insertErr.message}`);
    }

    return {
        created: true,
        alreadyExists: false,
        trip: newTrip,
        message: `Proximity Trigger Active: Created return trip from ${originCityShort} to ${destName} with ${formattedWaypoints.length} corridor points of load in database!`,
    };
};

export default {
    createTrip,
    getTrips,
    getTripById,
    getMyTrips,
    updateTripStatus,
    autoCreateReturnTripOnProximity,
};
