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
    const {
      communityId, title, description, date, time, endTime, locationName,
      mapUrl, category, coverPreset, maxAttendees, minAttendees, recurrence,
      isFree, fee, requirements, organizerNote, status,
    } = req.body;

    if (!communityId || !title || !date)
      return res.status(400).json({ message: 'communityId, title, and date required' });

    const event = await Event.create({
      communityId, title, description, date, time, endTime, locationName,
      mapUrl, category, coverPreset, maxAttendees, minAttendees,
      recurrence: recurrence ?? 'once',
      isFree: isFree ?? true,
      fee: isFree ? 0 : fee,
      requirements: requirements ?? [],
      organizerNote, status: status ?? 'published',
      attendees: [req.user!.userId],
      createdBy: req.user!.userId,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleEventMembership = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isJoined = event.attendees.includes(userId);

    if (!isJoined && event.maxAttendees && event.attendees.length >= event.maxAttendees)
      return res.status(400).json({ message: 'Event is full' });

    if (isJoined) {
      event.attendees = event.attendees.filter((id) => id !== userId);
    } else {
      event.attendees.push(userId);
    }
    await event.save();
    res.json({ joined: !isJoined, attendeesCount: event.attendees.length, event });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
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
