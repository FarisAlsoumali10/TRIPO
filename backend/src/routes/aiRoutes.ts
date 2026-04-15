import { Router } from 'express';
import { generateContent } from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Secure AI routes with standard auth middleware
router.post('/generate', authMiddleware, generateContent);

export default router;
