import { Router } from 'express';
import {
  getAllPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace,
} from '../controllers/placeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Reusable admin guard — defined once, applied by reference
const adminOnly = [authenticate, requireRole('admin')];

// ✅ تم تغيير '/places' إلى '/' 
router.route('/')
  .get(getAllPlaces)
  .post(adminOnly, createPlace);

// ✅ تم تغيير '/places/:placeId' إلى '/:placeId'
router.route('/:placeId')
  .get(getPlace)
  .patch(adminOnly, updatePlace)
  .delete(adminOnly, deletePlace);

export default router;