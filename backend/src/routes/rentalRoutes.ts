import { Router } from 'express';
import {
    getAllRentals,
    getRental,
    createRental,
    updateRental,
    deleteRental,
    bookRental,
} from '../controllers/rentalController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const adminOnly = [authenticate, requireRole('admin')];

router.route('/')
    .get(getAllRentals)
    .post(adminOnly, createRental);

router.route('/:rentalId')
    .get(getRental)
    .patch(adminOnly, updateRental)
    .delete(adminOnly, deleteRental);

router.route('/:rentalId/book')
    .post(authenticate, bookRental);

export default router;