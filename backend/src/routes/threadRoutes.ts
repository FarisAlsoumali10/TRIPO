import { Router } from 'express';
import { getThreadsByCommunity, createThread, addReply, toggleReaction, votePoll, togglePin } from '../controllers/threadController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router({ mergeParams: true }); // Important: allows inheriting :communityId

// Base route: /api/v1/communities/:communityId/threads
router.get('/', authenticate, getThreadsByCommunity);
router.post('/', authenticate, createThread);

// Actions on specific threads
router.post('/:threadId/replies', authenticate, addReply);
router.post('/:threadId/reactions', authenticate, toggleReaction);
router.post('/:threadId/vote', authenticate, votePoll);
router.patch('/:threadId/pin', authenticate, requireRole('admin'), togglePin);

export default router;
