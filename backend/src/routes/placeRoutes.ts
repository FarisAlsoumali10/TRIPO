import { Router } from 'express';
import {
  getPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace
} from '../controllers/placeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/places', authenticate, getPlaces);
router.get('/places/:placeId', authenticate, getPlace);
router.post('/places', authenticate, requireRole('admin'), createPlace);
router.patch('/places/:placeId', authenticate, requireRole('admin'), updatePlace);
router.delete('/places/:placeId', authenticate, requireRole('admin'), deletePlace);

export default router;
