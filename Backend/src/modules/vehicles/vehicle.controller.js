import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import {
    createVehicle,
    getOwnerVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    getAvailableDrivers,
} from './vehicle.service.js';

/**
 * Register Vehicle
 * POST /api/v1/vehicles
 */
export const createVehicleHandler = asyncHandler(async (req, res) => {
    const vehicle = await createVehicle(req.user.id, req.body);
    return sendCreated(res, vehicle, 'Vehicle registered successfully');
});

/**
 * List Owner's Vehicles
 * GET /api/v1/vehicles
 */
export const getMyVehiclesHandler = asyncHandler(async (req, res) => {
    const vehicles = await getOwnerVehicles(req.user.id);
    return sendSuccess(res, vehicles, 'Vehicles retrieved successfully');
});

/**
 * Get Single Vehicle Details
 * GET /api/v1/vehicles/:id
 */
export const getVehicleDetailsHandler = asyncHandler(async (req, res) => {
    const vehicle = await getVehicleById(req.params.id, req.user.id, req.user.role);
    return sendSuccess(res, vehicle, 'Vehicle details fetched');
});

/**
 * Update Vehicle Details
 * PATCH /api/v1/vehicles/:id
 */
export const updateVehicleHandler = asyncHandler(async (req, res) => {
    const updated = await updateVehicle(req.params.id, req.user.id, req.body);
    return sendSuccess(res, updated, 'Vehicle updated successfully');
});

/**
 * Deactivate / Delete Vehicle
 * DELETE /api/v1/vehicles/:id
 */
export const deleteVehicleHandler = asyncHandler(async (req, res) => {
    const result = await deleteVehicle(req.params.id, req.user.id);
    return sendSuccess(res, result, 'Vehicle deactivated successfully');
});

/**
 * Get Available Drivers for Assignment
 * GET /api/v1/vehicles/drivers/available
 */
export const getAvailableDriversHandler = asyncHandler(async (req, res) => {
    const drivers = await getAvailableDrivers();
    return sendSuccess(res, drivers, 'Available drivers fetched');
});
