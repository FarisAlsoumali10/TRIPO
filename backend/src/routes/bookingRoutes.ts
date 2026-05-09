import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyBookings, cancelMyBooking, rateBooking } from '../controllers/bookingController';

const router = Router();

router.get('/mine', authenticate, getMyBookings);
router.patch('/:id/cancel', authenticate, cancelMyBooking);
router.post('/:id/rate', authenticate, rateBooking);

export default router;
