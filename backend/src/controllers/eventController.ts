import { Request, Response } from 'express';
import { Event } from '../models/Event';

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const filter = req.query.communityId ? { communityId: req.query.communityId } : {};
    const events = await Event.find(filter).lean();
    return res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error: any) {
    console.error('❌ Error fetching events:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
