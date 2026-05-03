import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyBookings, cancelMyBooking } from '../controllers/bookingController';

const router = Router();

router.get('/mine', authenticate, getMyBookings);
router.patch('/:id/cancel', authenticate, cancelMyBooking);

export default router;
