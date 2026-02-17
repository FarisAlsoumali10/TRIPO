import { Router } from 'express';
import {
  getDashboard,
  hideContent,
  removeContent
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/admin/dashboard', authenticate, requireRole('admin'), getDashboard);
router.patch('/admin/content/:type/:id/hide', authenticate, requireRole('admin'), hideContent);
router.patch('/admin/content/:type/:id/remove', authenticate, requireRole('admin'), removeContent);

export default router;
