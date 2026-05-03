import { Router } from 'express';
import {
  getAllCommunities,
  getCommunity,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getJoinedCommunities,
  subscribeCommunity,
  unsubscribeCommunity,
  getSubscribedCommunities,
} from '../controllers/communityController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createCommunitySchema } from '../utils/validation';
import threadRoutes from './threadRoutes';

const router = Router();

// Static /me/* routes MUST come before /:communityId to avoid param capture
router.get('/me/joined', authenticate, getJoinedCommunities);
router.get('/me/subscribed', authenticate, getSubscribedCommunities);

// Public
router.get('/', getAllCommunities);
router.get('/:communityId', getCommunity);

// Auth-required write
router.post('/', authenticate, validate(createCommunitySchema), createCommunity);
router.post('/:communityId/join', authenticate, joinCommunity);
router.delete('/:communityId/join', authenticate, leaveCommunity);
router.post('/:communityId/subscribe', authenticate, subscribeCommunity);
router.delete('/:communityId/subscribe', authenticate, unsubscribeCommunity);

router.use('/:communityId/threads', threadRoutes);

export default router;
