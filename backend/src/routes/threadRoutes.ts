import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getThreads,
  createThread,
  replyToThread,
  toggleReaction,
  votePoll,
  togglePin,
} from '../controllers/threadController';

const router = Router();

router.get('/', getThreads);
router.post('/', authenticate, createThread);
router.post('/:id/reply', authenticate, replyToThread);
router.post('/:id/react', authenticate, toggleReaction);
router.post('/:id/vote', authenticate, votePoll);
router.patch('/:id/pin', authenticate, togglePin);

export default router;
