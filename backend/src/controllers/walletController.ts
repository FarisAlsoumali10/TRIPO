import { Response } from 'express';
import { AuthRequest } from '../types';
import { User } from '../models/User';
import { PointsTransaction } from '../models/PointsTransaction';
import { PayoutRequest } from '../models/PayoutRequest';
import { Notification } from '../models/Notification';

export const getMyWallet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('tripoPoints walletBalance explorerLevel');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = await PointsTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      tripoPoints: user.tripoPoints,
      walletBalance: user.walletBalance ?? 0,
      explorerLevel: user.explorerLevel,
      history: history.map((h) => ({
        id: h._id,
        action: h.action,
        points: h.points,
        label: h.label,
        timestamp: new Date(h.createdAt).getTime(),
      })),
    });
  } catch (error: any) {
    console.error('❌ getMyWallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
};

// ==========================================
// GET /wallet/earnings  — host earnings summary
// ==========================================
export const getEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('walletBalance');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pendingPayouts = await PayoutRequest.find({ hostId: userId, status: 'pending' });
    const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    const allPayouts = await PayoutRequest.find({ hostId: userId }).sort({ requestedAt: -1 }).limit(20).lean();

    res.json({
      walletBalance: user.walletBalance ?? 0,
      pendingPayoutTotal: pendingTotal,
      payoutHistory: allPayouts,
    });
  } catch (error: any) {
    console.error('❌ getEarnings error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

// ==========================================
// POST /wallet/request-payout
// ==========================================
export const requestPayout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, bankName, iban } = req.body as { amount: number; bankName?: string; iban?: string };

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }

    const user = await User.findById(userId).select('walletBalance');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.walletBalance ?? 0) < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance.' });
    }

    // Deduct balance immediately to prevent double-withdrawal
    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } });

    const payoutReq = await PayoutRequest.create({
      hostId: userId,
      amount,
      currency: 'SAR',
      bankName,
      iban,
      status: 'pending',
    });

    await Notification.create({
      userId,
      type: 'payout_requested',
      payload: { payoutRequestId: payoutReq._id, amount, currency: 'SAR' },
      read: false,
    });

    res.status(201).json({ success: true, payoutRequest: payoutReq, remainingBalance: (user.walletBalance ?? 0) - amount });
  } catch (error: any) {
    console.error('❌ requestPayout error:', error);
    res.status(500).json({ error: 'Failed to submit payout request' });
  }
};

export const awardPoints = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action, points, label } = req.body;
    if (!action || typeof points !== 'number' || !label) {
      return res.status(400).json({ error: 'action, points, and label are required' });
    }
    if (points <= 0) return res.status(400).json({ error: 'points must be positive' });

    const [user, transaction] = await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $inc: { tripoPoints: points } },
        { new: true, select: 'tripoPoints walletBalance explorerLevel' }
      ),
      PointsTransaction.create({ userId, action, points, label }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      tripoPoints: user.tripoPoints,
      walletBalance: user.walletBalance ?? 0,
      transaction: {
        id: transaction._id,
        action: transaction.action,
        points: transaction.points,
        label: transaction.label,
        timestamp: new Date(transaction.createdAt).getTime(),
      },
    });
  } catch (error: any) {
    console.error('❌ awardPoints error:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
};
