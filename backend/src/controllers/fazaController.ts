import { Request, Response } from 'express';
import { Faza } from '../models/Faza';
import { AuthRequest } from '../types';
import { User } from '../models/User';

export const getAllFazaRequests = async (req: Request, res: Response) => {
  try {
    const filter = req.query.communityId ? { communityId: req.query.communityId } : {};
    const requests = await Faza.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error: any) {
    console.error('❌ Error fetching faza requests:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const createFazaRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, question, category, urgency, pointsReward, photoUrl, anonymous } =
      req.body;
    if (!communityId || !question?.trim())
      return res.status(400).json({ message: 'communityId and question required' });
    if (!pointsReward || pointsReward < 10)
      return res.status(400).json({ message: 'Minimum reward is 10 points' });

    const userId = req.user!.userId;

    // Deduct points from user atomically
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { tripoPoints: -pointsReward } },
      { new: true }
    );
    if (!user || user.tripoPoints < 0) {
      // Rollback
      await User.findByIdAndUpdate(userId, { $inc: { tripoPoints: pointsReward } });
      return res.status(400).json({ message: 'Insufficient Karam points' });
    }

    const faza = await Faza.create({
      communityId,
      userId,
      userName: anonymous ? undefined : user.name,
      userAvatar: anonymous ? undefined : user.avatar,
      question: question.trim(),
      category,
      urgency: urgency ?? 'anytime',
      pointsReward,
      photoUrl,
      anonymous: anonymous ?? false,
      status: 'open',
    });
    res.status(201).json({ faza, updatedPoints: user.tripoPoints });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/faza/:id/answer
export const answerFazaRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { answerText } = req.body;
    if (!answerText?.trim()) return res.status(400).json({ message: 'answerText required' });

    const userId = req.user!.userId;

    const faza = await Faza.findById(req.params.id);
    if (!faza) return res.status(404).json({ message: 'Faza not found' });
    if (faza.status === 'completed') return res.status(409).json({ message: 'Already answered' });
    if (faza.userId === userId) return res.status(403).json({ message: 'Cannot answer your own faza' });

    const answerer = await User.findById(userId).select('name').lean();

    // Mark as completed
    faza.status = 'completed';
    faza.answeredBy = userId;
    faza.answeredByName = answerer?.name ?? 'مستخدم';
    faza.answeredAt = new Date();
    faza.answerText = answerText.trim();
    await faza.save();

    // Award points + cash to answerer atomically
    const cashReward = Math.floor(faza.pointsReward / 10);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          tripoPoints: faza.pointsReward,
          walletBalance: cashReward,
        },
      },
      { new: true }
    );

    // Update rank based on total faza answers (count in DB)
    const fazaAnsweredCount = await Faza.countDocuments({ answeredBy: userId });
    let newRank = updatedUser!.explorerLevel;
    if (fazaAnsweredCount >= 10) newRank = 'Faza Master';
    else if (fazaAnsweredCount >= 3) newRank = 'Community Helper';
    if (newRank !== updatedUser!.explorerLevel) {
      await User.findByIdAndUpdate(userId, { explorerLevel: newRank });
    }

    res.json({
      faza,
      pointsEarned: faza.pointsReward,
      cashEarned: cashReward,
      newTripoPoints: updatedUser!.tripoPoints,
      newWalletBalance: updatedUser!.walletBalance,
      newRank,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
