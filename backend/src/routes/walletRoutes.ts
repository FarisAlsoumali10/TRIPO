import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyWallet, awardPoints, getEarnings, requestPayout } from '../controllers/walletController';

const router = Router();

router.get('/me', authenticate, getMyWallet);
router.post('/award', authenticate, awardPoints);
router.get('/earnings', authenticate, getEarnings);
router.post('/request-payout', authenticate, requestPayout);

export default router;
