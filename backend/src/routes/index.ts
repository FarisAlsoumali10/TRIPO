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
import tourRoutes from './tourRoutes';
import googlePlacesRoutes from './googlePlacesRoutes';
import journalRoutes from './journals';
import aiRoutes from './aiRoutes';

// ─── مسارات الأقسام الجديدة ───
import rentalRoutes from './rentalRoutes';
import communityRoutes from './communityRoutes';
import eventRoutes from './eventRoutes';
import fazaRoutes from './fazaRoutes';
import travelPostRoutes from './travelPostRoutes';
import paymentRoutes from './paymentRoutes';
import bookingRoutes from './bookingRoutes';
import walletRoutes from './walletRoutes';
import searchRoutes from './searchRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.use('/itineraries', itineraryRoutes);
router.use('/places', placeRoutes);      // FIX: was '/', caused GET /places to match /:placeId handler

router.use('/', favoriteRoutes);
router.use('/', reviewRoutes);
router.use('/', groupTripRoutes);
router.use('/', messageRoutes);
router.use('/', notificationRoutes);
router.use('/', expenseRoutes);
router.use('/', reportRoutes);
router.use('/tours', tourRoutes);
router.use('/', googlePlacesRoutes);
router.use('/journals', journalRoutes);
router.use('/ai', aiRoutes);

// ─── دمج المسارات الجديدة التي طلبتها ───
router.use('/rentals', rentalRoutes);
router.use('/communities', communityRoutes);
router.use('/events', eventRoutes);
router.use('/faza-requests', fazaRoutes);
router.use('/travel-posts', travelPostRoutes);
router.use('/payments', paymentRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wallet', walletRoutes);
router.use('/search', searchRoutes);

export default router;
