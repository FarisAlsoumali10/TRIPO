import { Router } from 'express';
import {
  getAllEvents,
  getEvent,
  createEvent,
  toggleEventMembership,
  getJoinedEvents,
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createEventSchema } from '../utils/validation';

const router = Router();

// Static /me/* routes MUST come before /:eventId to avoid param capture
router.get('/me/joined', authenticate, getJoinedEvents);

// Public
router.get('/', getAllEvents);
router.get('/:eventId', getEvent);

// Auth-required
router.post('/', authenticate, validate(createEventSchema), createEvent);
router.post('/:eventId/join', authenticate, toggleEventMembership);

export default router;
