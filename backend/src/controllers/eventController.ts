import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { AuthRequest } from '../types';
import { Notification } from '../models/Notification';

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.communityId) filter.communityId = req.query.communityId;
    if (req.query.city) filter.city = { $regex: new RegExp(req.query.city as string, 'i') };
    if (req.query.category) filter.category = req.query.category;
    const events = await Event.find(filter).sort({ date: 1 }).lean();
    return res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error: any) {
    console.error('❌ Error fetching events:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId).lean();
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    return res.status(200).json({ success: true, data: event });
  } catch (error: any) {
    console.error('❌ Error fetching event:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const event = await Event.create({ ...req.body, organizerId: userId });
    return res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error('❌ Error creating event:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const toggleEventMembership = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const attendees = (event.attendees ?? []).map(String);
    const alreadyJoined = attendees.includes(String(userId));

    if (alreadyJoined) {
      event.attendees = (event.attendees ?? []).filter((id) => String(id) !== String(userId)) as any;
      event.attendeesCount = Math.max(0, (event.attendeesCount ?? 1) - 1);
    } else {
      (event.attendees ?? (event.attendees = [])).push(userId as any);
      event.attendeesCount = (event.attendeesCount ?? 0) + 1;

      // Notify the event organizer
      const io = (req as any).app?.get('io');
      if ((event as any).organizerId && String((event as any).organizerId) !== String(userId)) {
        const payload = { eventId: event._id, eventTitle: event.title, joinerId: userId };
        await Notification.create({ userId: (event as any).organizerId, type: 'new_joiner', payload, read: false });
        if (io) io.to(`user:${String((event as any).organizerId)}`).emit('notification', { type: 'new_joiner', payload });
      }
    }

    await event.save();
    return res.status(200).json({ success: true, data: event, joined: !alreadyJoined });
  } catch (error: any) {
    console.error('❌ Error toggling event membership:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getJoinedEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const events = await Event.find({ attendees: userId }).lean();
    return res.status(200).json({ success: true, data: events });
  } catch (error: any) {
    console.error('❌ Error fetching joined events:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
