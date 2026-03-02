import { Router } from 'express';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import placeRoutes from './placeRoutes';
import favoriteRoutes from './favoriteRoutes';
import reviewRoutes from './reviewRoutes';
import groupTripRoutes from './groupTripRoutes';
import messageRoutes from './messageRoutes';
import notificationRoutes from './notificationRoutes';
import expenseRoutes from './expenseRoutes';
import reportRoutes from './reportRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.use('/', placeRoutes);
router.use('/', favoriteRoutes);
router.use('/', reviewRoutes);
router.use('/', groupTripRoutes);
router.use('/', messageRoutes);
router.use('/', notificationRoutes);
router.use('/', expenseRoutes);
router.use('/', reportRoutes);
router.use('/', adminRoutes);

export default router;
