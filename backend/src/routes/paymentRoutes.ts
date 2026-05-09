import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createInvoice,
  verifyPayment,
  getPaymentHistory,
  mockPay,
} from '../controllers/paymentController';

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware as any);

// POST /api/v1/payments/create-invoice
// Body: { itemType: 'event'|'tour'|'rental', itemId, quantity?, bookingId? }
// Returns: { success: true, url: "https://moyasar...", paymentId: "..." }
router.post('/create-invoice', createInvoice as any);

// POST /api/v1/payments/verify
// Body: { paymentId }  — Moyasar payment ID from redirect ?id= param
// Returns: { success: true, paid: boolean, status?, message? }
router.post('/verify', verifyPayment as any);

// GET /api/v1/payments/history
router.get('/history', getPaymentHistory as any);

// POST /api/v1/payments/mock-pay
router.post('/mock-pay', mockPay as any);

// NOTE: The webhook route is registered in server.ts BEFORE express.json()
// so it receives a raw Buffer for body verification.
// Endpoint: POST /api/v1/payments/webhook

export default router;
