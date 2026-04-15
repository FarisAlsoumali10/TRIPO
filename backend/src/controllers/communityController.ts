import { Request, Response } from 'express';
import { Community } from '../models/Community';

export const getAllCommunities = async (req: Request, res: Response) => {
  try {
    const communities = await Community.find({}).lean();
    return res.status(200).json({ success: true, count: communities.length, data: communities });
  } catch (error: any) {
    console.error('❌ Error fetching communities:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
