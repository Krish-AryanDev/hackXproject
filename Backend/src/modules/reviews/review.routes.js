import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js';
import * as reviewController from './review.controller.js';

const router = Router();

// Post-delivery review submission (Requires auth: Shipper reviewing carrier or Carrier reviewing shipper)
router.post('/', authenticateUser, reviewController.createReview);

// Get all reviews received by a profile (Public or Authenticated)
router.get('/profile/:profileId', reviewController.getProfileReviews);

// Get reviews for a specific booking
router.get('/booking/:bookingId', authenticateUser, reviewController.getBookingReviews);

export default router;
