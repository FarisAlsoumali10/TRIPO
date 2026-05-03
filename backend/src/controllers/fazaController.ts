import { Request, Response } from 'express';
import { Faza } from '../models/Faza';
import { AuthRequest } from '../types';

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
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { question, communityId, category, urgency, rewardPoints, anonymous } = req.body;
    if (!question?.trim()) return res.status(400).json({ success: false, error: 'Question is required' });

    const request = await Faza.create({
      userId,
      communityId: communityId || undefined,
      question: question.trim(),
      category: category || 'general',
      urgency: urgency || 'anytime',
      pointsReward: rewardPoints ?? 50,
      anonymous: !!anonymous,
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    console.error('❌ Error creating faza request:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
