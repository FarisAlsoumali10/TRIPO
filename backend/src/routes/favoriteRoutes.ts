import { Router } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite
} from '../controllers/favoriteController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/favorites', authenticate, getFavorites);
router.post('/favorites', authenticate, addFavorite);
router.delete('/favorites/:placeId', authenticate, removeFavorite);

export default router;
