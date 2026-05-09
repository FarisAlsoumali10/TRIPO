import { Router } from 'express';
import { getAllFazaRequests, createFazaRequest, answerFazaRequest } from '../controllers/fazaController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllFazaRequests);
router.post('/', authenticate, createFazaRequest);
router.post('/:id/answer', authenticate, answerFazaRequest);

export default router;
