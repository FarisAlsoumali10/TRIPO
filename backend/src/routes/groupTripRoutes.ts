import { Router } from 'express';
import {
  createGroupTrip,
  getGroupTrip,
  getUserGroupTrips,
  inviteToGroupTrip,
  respondToInvitation,
  removeMember,
  leaveGroupTrip
} from '../controllers/groupTripController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createGroupTripSchema } from '../utils/validation';

const router = Router();

router.post('/group-trips', authenticate, validate(createGroupTripSchema), createGroupTrip);
router.get('/group-trips/:groupTripId', authenticate, getGroupTrip);
router.get('/group-trips', authenticate, getUserGroupTrips);
router.post('/group-trips/:groupTripId/invite', authenticate, inviteToGroupTrip);
router.patch('/group-trips/:groupTripId/invitations/:invitationId', authenticate, respondToInvitation);
router.delete('/group-trips/:groupTripId/members/:userId', authenticate, removeMember);
router.post('/group-trips/:groupTripId/leave', authenticate, leaveGroupTrip);

export default router;
