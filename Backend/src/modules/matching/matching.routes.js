import { Router } from 'express';
import {
    searchMatchingTripsHandler,
    checkCompatibilityHandler,
} from './matching.controller.js';

const router = Router();

// Public / Business Search Endpoints (Accessible for matching query & AI testing)
router.post('/search', searchMatchingTripsHandler);
router.post('/check-compatibility', checkCompatibilityHandler);

export default router;
