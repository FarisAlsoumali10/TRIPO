import { Router } from 'express';
import { getAllFazaRequests } from '../controllers/fazaController';

const router = Router();

router.get('/', getAllFazaRequests);

export default router;
