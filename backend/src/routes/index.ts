import { Router } from 'express';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import placeRoutes from './placeRoutes';
import itineraryRoutes from './itineraryRoutes';
import favoriteRoutes from './favoriteRoutes';
import reviewRoutes from './reviewRoutes';
import groupTripRoutes from './groupTripRoutes';
import messageRoutes from './messageRoutes';
import notificationRoutes from './notificationRoutes';
import expenseRoutes from './expenseRoutes';
import reportRoutes from './reportRoutes';
import adminRoutes from './adminRoutes';
import tourRoutes from './tourRoutes';
import googlePlacesRoutes from './googlePlacesRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.use('/itineraries', itineraryRoutes);
router.use('/', placeRoutes);
router.use('/', favoriteRoutes);
router.use('/', reviewRoutes);
router.use('/', groupTripRoutes);
router.use('/', messageRoutes);
router.use('/', notificationRoutes);
router.use('/', expenseRoutes);
router.use('/', reportRoutes);
router.use('/', adminRoutes);
router.use('/tours', tourRoutes);
router.use('/', googlePlacesRoutes);
router.use('/ai', aiRoutes);

export default router;
