import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:notificationId/read', authenticate, markAsRead);
router.patch('/notifications/read-all', authenticate, markAllAsRead);

export default router;
