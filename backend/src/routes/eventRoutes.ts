import { Router } from 'express';
import { getAllEvents } from '../controllers/eventController';

const router = Router();

router.get('/', getAllEvents);

export default router;
