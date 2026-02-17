import { Router } from 'express';
import {
  createReport,
  getReports,
  reviewReport
} from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createReportSchema } from '../utils/validation';

const router = Router();

router.post('/reports', authenticate, validate(createReportSchema), createReport);
router.get('/reports', authenticate, requireRole('admin'), getReports);
router.patch('/reports/:reportId/review', authenticate, requireRole('admin'), reviewReport);

export default router;
