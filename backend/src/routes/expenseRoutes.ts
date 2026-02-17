import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  getSplitBudget
} from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createExpenseSchema } from '../utils/validation';

const router = Router();

router.get('/expenses', authenticate, getExpenses);
router.post('/expenses', authenticate, validate(createExpenseSchema), createExpense);
router.get('/expenses/split/:groupTripId', authenticate, getSplitBudget);

export default router;
