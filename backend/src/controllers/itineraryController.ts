import { Response } from 'express';
import { AuthRequest } from '../types';
import { Itinerary } from '../models/Itinerary';

export const createItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const { title, city, durationInMinutes, isPublic, stops } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const itinerary = await Itinerary.create({
      title,
      city,
      durationInMinutes,
      isPublic: isPublic || false,
      stops,
      createdBy: req.user.userId
    });

    return res.status(201).json(itinerary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Server error creating itinerary' });
  }
};

export const getAllItineraries = async (req: AuthRequest, res: Response) => {
  try {
    const { city } = req.query;

    const filter: any = {};
    if (city) {
      filter.city = { $regex: new RegExp(String(city), 'i') }; // Case-insensitive exact or partial match
    }

    // Only fetch public itineraries, or perhaps we want all itineraries depending on requirements.
    // The prompt doesn't specify 'only public', so I'll just fetch based on city.
    // Assuming we fetch itineraries the user created or that are public.
    const itineraries = await Itinerary.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(itineraries);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Server error fetching itineraries' });
  }
};
