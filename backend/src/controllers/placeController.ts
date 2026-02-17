import { Response } from 'express';
import { AuthRequest } from '../types';
import { Place } from '../models';

export const getPlaces = async (req: AuthRequest, res: Response) => {
  try {
    const { city, categoryTags, search, page = 1, limit = 20 } = req.query;

    const query: any = { status: 'active' };

    if (city) query.city = city;
    if (categoryTags) {
      const tags = (categoryTags as string).split(',');
      query.categoryTags = { $in: tags };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const places = await Place.find(query)
      .sort({ 'ratingSummary.avgRating': -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Place.countDocuments(query);

    res.json({
      places,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    throw error;
  }
};

export const getPlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const place = await Place.findOne({ _id: placeId, status: 'active' });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    throw error;
  }
};

export const createPlace = async (req: AuthRequest, res: Response) => {
  try {
    const placeData = req.body;

    const place = await Place.create(placeData);

    res.status(201).json(place);
  } catch (error) {
    throw error;
  }
};

export const updatePlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;
    const updates = req.body;

    const place = await Place.findByIdAndUpdate(
      placeId,
      updates,
      { new: true, runValidators: true }
    );

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    throw error;
  }
};

export const deletePlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const place = await Place.findByIdAndUpdate(
      placeId,
      { status: 'deactivated' },
      { new: true }
    );

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({ message: 'Place deactivated successfully' });
  } catch (error) {
    throw error;
  }
};
