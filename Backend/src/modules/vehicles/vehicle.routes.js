import { Router } from 'express';
import {
    createVehicleHandler,
    getMyVehiclesHandler,
    getVehicleDetailsHandler,
    updateVehicleHandler,
    deleteVehicleHandler,
    getAvailableDriversHandler,
} from './vehicle.controller.js';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all vehicle routes
router.use(authenticateUser);

// Owner vehicle operations
router.post('/', requireRoles('owner', 'admin'), createVehicleHandler);
router.get('/', requireRoles('owner', 'admin'), getMyVehiclesHandler);
router.get('/drivers/available', requireRoles('owner', 'admin'), getAvailableDriversHandler);
router.get('/:id', requireRoles('owner', 'driver', 'admin'), getVehicleDetailsHandler);
router.patch('/:id', requireRoles('owner', 'admin'), updateVehicleHandler);
router.delete('/:id', requireRoles('owner', 'admin'), deleteVehicleHandler);

export default router;
