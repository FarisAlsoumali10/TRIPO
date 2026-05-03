import { Router } from 'express';
import {
  createItinerary,
  getAllItineraries,
  getItinerary,
  updateItinerary,
  deleteItinerary,
} from '../controllers/itineraryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createItinerary);
router.get('/', getAllItineraries);
router.get('/:id', getItinerary);
router.patch('/:id', updateItinerary);
router.delete('/:id', deleteItinerary);

export default router;
