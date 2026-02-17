import { Router } from 'express';
import {
  getFeed,
  getItinerary,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  verifyItinerary
} from '../controllers/itineraryController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createItinerarySchema } from '../utils/validation';

const router = Router();

router.get('/itineraries/feed', authenticate, getFeed);
router.get('/itineraries/:itineraryId', authenticate, getItinerary);
router.post('/itineraries', authenticate, validate(createItinerarySchema), createItinerary);
router.patch('/itineraries/:itineraryId', authenticate, updateItinerary);
router.delete('/itineraries/:itineraryId', authenticate, deleteItinerary);
router.patch('/itineraries/:itineraryId/verify', authenticate, requireRole('admin'), verifyItinerary);

export default router;
