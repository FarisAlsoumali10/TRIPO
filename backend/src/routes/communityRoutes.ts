import { Router } from 'express';
import { getAllCommunities } from '../controllers/communityController';
import threadRoutes from './threadRoutes';

const router = Router();

router.get('/', getAllCommunities);

router.use('/:communityId/threads', threadRoutes);

export default router;
