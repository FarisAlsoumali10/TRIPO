import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createCheckoutSession, getPaymentHistory } from '../controllers/paymentController';

const router = Router();

// All routes below require a valid JWT
router.use(authMiddleware as any);

// POST /api/v1/payments/create-checkout-session
router.post('/create-checkout-session', createCheckoutSession as any);

// GET /api/v1/payments/history
router.get('/history', getPaymentHistory as any);

// NOTE: The webhook route is intentionally NOT here.
// It is registered in server.ts BEFORE express.json() to preserve the raw body.

export default router;
