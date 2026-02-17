import { Router } from 'express';
import { register, login, requestPasswordReset, resetPassword } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema } from '../utils/validation';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
