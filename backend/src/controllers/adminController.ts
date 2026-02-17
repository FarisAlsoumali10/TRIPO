import { Response } from 'express';
import { AuthRequest } from '../types';
import { User, Place, Itinerary, GroupTrip, Report } from '../models';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalPlaces,
      totalItineraries,
      totalGroupTrips,
      pendingReports
    ] = await Promise.all([
      User.countDocuments(),
      Place.countDocuments({ status: 'active' }),
      Itinerary.countDocuments({ status: 'published' }),
      GroupTrip.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    const recentUsers = await User.find()
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentReports = await Report.find()
      .populate('reporterId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        totalPlaces,
        totalItineraries,
        totalGroupTrips,
        pendingReports
      },
      recentUsers,
      recentReports
    });
  } catch (error) {
    throw error;
  }
};

export const hideContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;

    let Model;
    switch (type) {
      case 'place':
        Model = Place;
        break;
      case 'itinerary':
        Model = Itinerary;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    const content = await Model.findByIdAndUpdate(
      id,
      { status: 'hidden' },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ message: 'Content hidden successfully', content });
  } catch (error) {
    throw error;
  }
};

export const removeContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;

    let Model;
    switch (type) {
      case 'place':
        Model = Place;
        break;
      case 'itinerary':
        Model = Itinerary;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    const content = await Model.findByIdAndUpdate(
      id,
      { status: 'removed' },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ message: 'Content removed successfully', content });
  } catch (error) {
    throw error;
  }
};
