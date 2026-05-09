import { Router } from 'express';
import { getPlacePhoto } from '../controllers/photoController';

const router = Router();

// GET /api/photos?place=Diriyah
router.get('/', getPlacePhoto);

export default router;
