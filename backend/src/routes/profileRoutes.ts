import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateSmartProfile,
  getPublicProfile
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema, updateSmartProfileSchema } from '../utils/validation';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.patch('/profile/smart-profile', authenticate, validate(updateSmartProfileSchema), updateSmartProfile);
router.get('/users/:userId/public-profile', authenticate, getPublicProfile);

export default router;
