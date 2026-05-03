import { Router } from 'express';
import {
  register, login, requestPasswordReset, resetPassword,
  getMe, socialAuth, refreshAccessToken,
} from '../controllers/authController';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema, requestPasswordResetSchema, resetPasswordSchema } from '../utils/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/request-password-reset', validate(requestPasswordResetSchema), requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, getMe);
router.post('/social', socialAuth);

export default router;
