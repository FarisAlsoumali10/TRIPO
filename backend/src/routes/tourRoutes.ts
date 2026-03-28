import { Router } from 'express';
import { getTours, getTour, createTour, bookTour } from '../controllers/tourController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getTours);
router.get('/:id', getTour);

// Protected routes
router.post('/', authenticate, createTour);
router.post('/:tourId/book', authenticate, bookTour);

export default router;
