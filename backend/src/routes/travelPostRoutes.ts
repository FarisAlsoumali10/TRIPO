import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTravelPosts, createTravelPost, joinTravelPost } from '../controllers/travelPostController';

const router = Router();

router.get('/', getTravelPosts);
router.post('/', authenticate, createTravelPost);
router.post('/:id/join', authenticate, joinTravelPost);

export default router;
