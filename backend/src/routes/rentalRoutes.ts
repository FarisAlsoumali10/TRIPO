import { Router } from 'express';
import {
    getAllRentals,
    getRental,
    createRental,
    updateRental,
    deleteRental,
    bookRental,
    getMyRentals,
    getMyRentalBookings,
} from '../controllers/rentalController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.route('/')
    .get(getAllRentals)
    .post(authenticate, createRental);

router.get('/mine', authenticate, getMyRentals);
router.get('/mine/bookings', authenticate, getMyRentalBookings);

router.route('/:rentalId')
    .get(getRental)
    .patch(authenticate, updateRental)
    .delete(authenticate, deleteRental);

router.route('/:rentalId/book')
    .post(authenticate, bookRental);

export default router;
