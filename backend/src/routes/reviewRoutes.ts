import { Router } from 'express';
import {
  getReviews,
  createReview,
  updateReview,
  deleteReview
} from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createReviewSchema } from '../utils/validation';

const router = Router();

router.get('/reviews', getReviews);          // public read
router.post('/reviews', authenticate, validate(createReviewSchema), createReview);
router.patch('/reviews/:reviewId', authenticate, updateReview);
router.delete('/reviews/:reviewId', authenticate, deleteReview);

export default router;
