import { Router } from 'express';
import {
  getTours, getTour, createTour, bookTour,
  getMyTours, getMyTourBookings, updateMyTour, deleteMyTour,
} from '../controllers/tourController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getTours);

// Authenticated — /mine must come before /:id to avoid conflict
router.get('/mine', authenticate, getMyTours);
router.get('/mine/bookings', authenticate, getMyTourBookings);

router.get('/:id', getTour);

// Protected routes
router.post('/', authenticate, createTour);
router.post('/:tourId/book', authenticate, bookTour);
router.patch('/:tourId', authenticate, updateMyTour);
router.delete('/:tourId', authenticate, deleteMyTour);

export default router;
