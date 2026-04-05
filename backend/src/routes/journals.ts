import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMyJournals, getPublicJournals, getJournal, getJournalByToken,
  createJournal, updateJournal, deleteJournal, generateShareLink,
} from '../controllers/journalController';

const router = Router();

router.get('/public',        authenticate, getPublicJournals);
router.get('/shared/:token', getJournalByToken);
router.get('/',              authenticate, getMyJournals);
router.get('/:id',           authenticate, getJournal);
router.post('/',             authenticate, createJournal);
router.patch('/:id',         authenticate, updateJournal);
router.delete('/:id',        authenticate, deleteJournal);
router.post('/:id/share',    authenticate, generateShareLink);

export default router;
