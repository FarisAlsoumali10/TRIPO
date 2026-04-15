import { Request, Response } from 'express';
import { Faza } from '../models/Faza';

export const getAllFazaRequests = async (req: Request, res: Response) => {
  try {
    const filter = req.query.communityId ? { communityId: req.query.communityId } : {};
    const requests = await Faza.find(filter).lean();
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error: any) {
    console.error('❌ Error fetching faza requests:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
