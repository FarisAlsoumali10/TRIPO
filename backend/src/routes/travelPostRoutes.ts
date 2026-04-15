import { Router } from 'express';
import { getTravelPosts, createTravelPost, joinTravelPost } from '../controllers/travelPostController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getTravelPosts);
router.post('/', authenticate, createTravelPost);
router.post('/:postId/join', authenticate, joinTravelPost);

export default router;
