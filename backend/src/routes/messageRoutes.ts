import { Router } from 'express';
import { getMessages, sendMessage } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createMessageSchema } from '../utils/validation';

const router = Router();

router.get('/messages', authenticate, getMessages);
router.post('/messages', authenticate, validate(createMessageSchema), sendMessage);

export default router;
