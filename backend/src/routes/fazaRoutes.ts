import { Router } from 'express';
import { getAllFazaRequests, createFazaRequest } from '../controllers/fazaController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllFazaRequests);
router.post('/', authenticate, createFazaRequest);

export default router;
