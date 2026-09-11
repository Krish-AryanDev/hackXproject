import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';

const VALID_VEHICLE_TYPES = [
    'closed_container',
    'open_body_truck',
    'flatbed',
    'refrigerated',
    'tanker',
    'mini_truck',
    'other',
];

/**
 * Register a new vehicle
 */
export const createVehicle = async (ownerId, data) => {
    const {
        registration_number,
        vehicle_type = 'closed_container',
        max_weight_capacity_tons,
        max_volume_capacity_cft,
        model_name,
        assigned_driver_id,
    } = data;

    if (!registration_number) {
        throw ApiError.badRequest('Vehicle registration number is required');
    }
    if (!max_weight_capacity_tons || parseFloat(max_weight_capacity_tons) <= 0) {
        throw ApiError.badRequest('A positive max weight capacity in tons is required');
    }
    if (!VALID_VEHICLE_TYPES.includes(vehicle_type)) {
        throw ApiError.badRequest(`Invalid vehicle type. Allowed: ${VALID_VEHICLE_TYPES.join(', ')}`);
    }

    const sanitizedRegNo = registration_number.trim().toUpperCase();

    // Check registration uniqueness
    const { data: existing } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('registration_number', sanitizedRegNo)
        .maybeSingle();

    if (existing) {
        throw ApiError.conflict(`Vehicle with registration '${sanitizedRegNo}' is already registered`);
    }

    // Verify driver if assigned
    if (assigned_driver_id) {
        const { data: driver } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', assigned_driver_id)
            .maybeSingle();

        if (!driver || driver.role !== 'driver') {
            throw ApiError.badRequest('Assigned driver ID must belong to a valid registered driver profile');
        }
    }

    const { data: vehicle, error } = await supabaseAdmin
        .from('vehicles')
        .insert([
            {
                owner_id: ownerId,
                assigned_driver_id: assigned_driver_id || null,
                registration_number: sanitizedRegNo,
                vehicle_type,
                max_weight_capacity_tons: parseFloat(max_weight_capacity_tons),
                max_volume_capacity_cft: max_volume_capacity_cft ? parseFloat(max_volume_capacity_cft) : null,
                model_name: model_name || null,
            },
        ])
        .select(`
            *,
            assigned_driver:profiles!vehicles_assigned_driver_id_fkey(id, full_name, phone, rating_avg)
        `)
        .single();

    if (error) {
        throw ApiError.internal(`Failed to register vehicle: ${error.message}`);
    }

    return vehicle;
};

/**
 * List all vehicles owned by a specific owner
 */
export const getOwnerVehicles = async (ownerId) => {
    const { data, error } = await supabaseAdmin
        .from('vehicles')
        .select(`
            *,
            assigned_driver:profiles!vehicles_assigned_driver_id_fkey(id, full_name, phone, rating_avg)
        `)
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        throw ApiError.internal(`Failed to fetch vehicles: ${error.message}`);
    }

    return data || [];
};

/**
 * Get vehicle details by ID
 */
export const getVehicleById = async (vehicleId, requesterId, userRole) => {
    const { data, error } = await supabaseAdmin
        .from('vehicles')
        .select(`
            *,
            owner:profiles!vehicles_owner_id_fkey(id, full_name, phone, company_name),
            assigned_driver:profiles!vehicles_assigned_driver_id_fkey(id, full_name, phone, rating_avg)
        `)
        .eq('id', vehicleId)
        .single();

    if (error || !data) {
        throw ApiError.notFound('Vehicle not found');
    }

    // Restrict access if not owner or assigned driver or admin
    if (userRole === 'owner' && data.owner_id !== requesterId) {
        throw ApiError.forbidden('You can only view vehicles from your fleet');
    }

    return data;
};

/**
 * Update vehicle specs or assigned driver
 */
export const updateVehicle = async (vehicleId, ownerId, updates) => {
    // Check ownership
    const { data: existing, error: findError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

    if (findError || !existing) {
        throw ApiError.notFound('Vehicle not found');
    }

    if (existing.owner_id !== ownerId) {
        throw ApiError.forbidden('You do not own this vehicle');
    }

    const payload = {};
    if (updates.model_name !== undefined) payload.model_name = updates.model_name;
    if (updates.max_weight_capacity_tons !== undefined) payload.max_weight_capacity_tons = parseFloat(updates.max_weight_capacity_tons);
    if (updates.max_volume_capacity_cft !== undefined) payload.max_volume_capacity_cft = parseFloat(updates.max_volume_capacity_cft);
    if (updates.vehicle_type !== undefined) {
        if (!VALID_VEHICLE_TYPES.includes(updates.vehicle_type)) {
            throw ApiError.badRequest(`Invalid vehicle type. Allowed: ${VALID_VEHICLE_TYPES.join(', ')}`);
        }
        payload.vehicle_type = updates.vehicle_type;
    }

    if (updates.assigned_driver_id !== undefined) {
        if (updates.assigned_driver_id === null) {
            payload.assigned_driver_id = null;
        } else {
            const { data: driver } = await supabaseAdmin
                .from('profiles')
                .select('id, role')
                .eq('id', updates.assigned_driver_id)
                .maybeSingle();

            if (!driver || driver.role !== 'driver') {
                throw ApiError.badRequest('Assigned driver ID must belong to a valid registered driver profile');
            }
            payload.assigned_driver_id = updates.assigned_driver_id;
        }
    }

    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
        .from('vehicles')
        .update(payload)
        .eq('id', vehicleId)
        .select(`
            *,
            assigned_driver:profiles!vehicles_assigned_driver_id_fkey(id, full_name, phone, rating_avg)
        `)
        .single();

    if (error) {
        throw ApiError.badRequest(`Failed to update vehicle: ${error.message}`);
    }

    return updated;
};

/**
 * Delete (soft-delete / deactivate) vehicle
 */
export const deleteVehicle = async (vehicleId, ownerId) => {
    const { data: existing, error: findError } = await supabaseAdmin
        .from('vehicles')
        .select('id, owner_id')
        .eq('id', vehicleId)
        .single();

    if (findError || !existing) {
        throw ApiError.notFound('Vehicle not found');
    }

    if (existing.owner_id !== ownerId) {
        throw ApiError.forbidden('You do not own this vehicle');
    }

    const { error } = await supabaseAdmin
        .from('vehicles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);

    if (error) {
        throw ApiError.internal(`Failed to deactivate vehicle: ${error.message}`);
    }

    return { id: vehicleId, is_active: false };
};

/**
 * List available drivers in the platform for assignment
 */
export const getAvailableDrivers = async () => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, rating_avg, rating_count, is_verified')
        .eq('role', 'driver')
        .order('rating_avg', { ascending: false });

    if (error) {
        throw ApiError.internal(`Failed to fetch drivers: ${error.message}`);
    }

    return data || [];
};

export default {
    createVehicle,
    getOwnerVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    getAvailableDrivers,
};
