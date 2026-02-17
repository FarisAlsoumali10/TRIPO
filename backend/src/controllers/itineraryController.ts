import { Response } from 'express';
import { AuthRequest } from '../types';
import { Itinerary, User } from '../models';
import { recommendationService } from '../services/recommendationService';

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.user?.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const feed = await recommendationService.getPersonalizedFeed(
      user._id,
      user.smartProfile,
      Number(page),
      Number(limit)
    );

    res.json(feed);
  } catch (error) {
    throw error;
  }
};

export const getItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const { itineraryId } = req.params;

    const itinerary = await Itinerary.findById(itineraryId)
      .populate('userId', 'name avatar')
      .populate('places.placeId', 'name photos categoryTags coordinates');

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    // Only allow viewing published itineraries or own drafts
    if (itinerary.status === 'draft' && itinerary.userId.toString() !== req.user?.userId) {
      return res.status(403).json({ error: 'Cannot view draft itinerary' });
    }

    res.json(itinerary);
  } catch (error) {
    throw error;
  }
};

export const createItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const itineraryData = {
      ...req.body,
      userId: req.user?.userId
    };

    const itinerary = await Itinerary.create(itineraryData);

    res.status(201).json(itinerary);
  } catch (error) {
    throw error;
  }
};

export const updateItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const { itineraryId } = req.params;
    const updates = req.body;

    const itinerary = await Itinerary.findOne({
      _id: itineraryId,
      userId: req.user?.userId
    });

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found or not authorized' });
    }

    Object.assign(itinerary, updates);
    await itinerary.save();

    res.json(itinerary);
  } catch (error) {
    throw error;
  }
};

export const deleteItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const { itineraryId } = req.params;

    const itinerary = await Itinerary.findOneAndDelete({
      _id: itineraryId,
      userId: req.user?.userId
    });

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found or not authorized' });
    }

    res.json({ message: 'Itinerary deleted successfully' });
  } catch (error) {
    throw error;
  }
};

export const verifyItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const { itineraryId } = req.params;
    const { isVerified } = req.body;

    const itinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      { isVerified },
      { new: true }
    );

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    res.json(itinerary);
  } catch (error) {
    throw error;
  }
};
