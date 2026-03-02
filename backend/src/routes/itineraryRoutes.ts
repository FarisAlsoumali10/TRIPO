import { Router } from 'express';
import { createItinerary, getAllItineraries } from '../controllers/itineraryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all routes
router.use(authMiddleware);

router.post('/', createItinerary);
router.get('/', getAllItineraries);

export default router;
