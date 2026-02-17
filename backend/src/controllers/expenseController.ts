import { Response } from 'express';
import { AuthRequest } from '../types';
import { Expense, GroupTrip, Notification } from '../models';
import { splitBudgetService } from '../services/splitBudgetService';

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.query;

    if (!groupTripId) {
      return res.status(400).json({ error: 'groupTripId is required' });
    }

    // Verify user is member
    const groupTrip = await GroupTrip.findById(groupTripId);
    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const isMember = groupTrip.memberIds.some(
      (id: any) => id.toString() === req.user?.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    const expenses = await Expense.find({ groupTripId })
      .populate('payerId', 'name avatar')
      .populate('involvedMemberIds', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    throw error;
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expenseData = req.body;

    // Verify user is member
    const groupTrip = await GroupTrip.findById(expenseData.groupTripId);
    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const isMember = groupTrip.memberIds.some(
      (id: any) => id.toString() === req.user?.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    const expense = await Expense.create(expenseData);

    const populatedExpense = await Expense.findById(expense._id)
      .populate('payerId', 'name avatar')
      .populate('involvedMemberIds', 'name avatar');

    // Notify involved members
    for (const memberId of expense.involvedMemberIds) {
      if (memberId.toString() !== req.user?.userId) {
        await Notification.create({
          userId: memberId,
          type: 'expense_added',
          payload: {
            groupTripId: groupTrip._id,
            groupTripTitle: groupTrip.title,
            expenseId: expense._id,
            amount: expense.amount,
            description: expense.description
          },
          read: false
        });
      }
    }

    res.status(201).json(populatedExpense);
  } catch (error) {
    throw error;
  }
};

export const getSplitBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { groupTripId } = req.params;

    // Verify user is member
    const groupTrip = await GroupTrip.findById(groupTripId);
    if (!groupTrip) {
      return res.status(404).json({ error: 'Group trip not found' });
    }

    const isMember = groupTrip.memberIds.some(
      (id: any) => id.toString() === req.user?.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group trip' });
    }

    const split = await splitBudgetService.calculateSplit(groupTripId);

    res.json(split);
  } catch (error) {
    throw error;
  }
};
