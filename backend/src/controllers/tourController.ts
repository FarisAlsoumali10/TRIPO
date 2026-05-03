import { Response } from 'express';
import { AuthRequest } from '../types';
import { Tour } from '../models/Tour';
import { Booking, Itinerary } from '../models';
import { User } from '../models/User';
import { Types } from 'mongoose';

// ==========================================
// GET /api/v1/tours
// Public — returns all active tours, supports ?category= filter
// ==========================================
export const getTours = async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, any> = { status: 'active' };
    if (req.query.category && req.query.category !== 'all') {
      filter.category = { $regex: new RegExp(req.query.category as string, 'i') };
    }

    let sort: Record<string, any> = { bookingsCount: -1, rating: -1 };
    if (req.query.sort === 'newest') sort = { createdAt: -1 };

    const tours = await Tour.find(filter).sort(sort);
    res.json(tours);
  } catch (error: any) {
    console.error('❌ getTours error:', error);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
};

// ==========================================
// GET /api/v1/tours/:id
// Public — returns a single tour, populates baseItineraryId
// ==========================================
export const getTour = async (req: AuthRequest, res: Response) => {
  try {
    const tour = await Tour.findById(req.params.id).populate('baseItineraryId');
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    res.json(tour);
  } catch (error: any) {
    console.error('❌ getTour error:', error);
    res.status(500).json({ error: 'Failed to fetch tour' });
  }
};

// ==========================================
// POST /api/v1/tours
// Authenticated — any user can publish a tour
// ==========================================
export const createTour = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, pricePerPerson } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (pricePerPerson === undefined || pricePerPerson === null) {
      return res.status(400).json({ error: 'Price per person is required' });
    }

    const owner = await User.findById(userId).select('name avatar').lean();

    const tour = await Tour.create({
      ...req.body,
      ownerId: new Types.ObjectId(userId),
      guideName: req.body.guideName || (owner as any)?.name || 'Host',
      guideAvatar: req.body.guideAvatar || (owner as any)?.avatar,
      category: req.body.category || 'community',
      status: 'active',
    });
    res.status(201).json(tour);
  } catch (error: any) {
    console.error('❌ createTour error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A tour with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create tour' });
  }
};

// ==========================================
// GET /api/v1/tours/mine
// Authenticated — returns tours the current user created
// ==========================================
export const getMyTours = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tours = await Tour.find({ ownerId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
    res.json(tours);
  } catch (error: any) {
    console.error('❌ getMyTours error:', error);
    res.status(500).json({ error: 'Failed to fetch your tours' });
  }
};

// ==========================================
// GET /api/v1/tours/mine/bookings
// Authenticated — returns bookings for tours the current user owns
// ==========================================
export const getMyTourBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const myTours = await Tour.find({ ownerId: new Types.ObjectId(userId) }).select('_id title').lean();
    const tourIds = myTours.map(t => t._id);

    const bookings = await Booking.find({ targetType: 'tour', targetId: { $in: tourIds } })
      .populate('userId', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error: any) {
    console.error('❌ getMyTourBookings error:', error);
    res.status(500).json({ error: 'Failed to fetch tour bookings' });
  }
};

// ==========================================
// PATCH /api/v1/tours/:tourId
// Authenticated — update own tour
// ==========================================
export const updateMyTour = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    if (tour.ownerId?.toString() !== userId) {
      return res.status(403).json({ error: 'You can only edit your own tours' });
    }

    const forbidden = ['ownerId', 'bookingsCount', 'rating', 'reviewCount', 'slug'];
    forbidden.forEach(f => delete req.body[f]);

    Object.assign(tour, req.body);
    await tour.save();
    res.json(tour);
  } catch (error: any) {
    console.error('❌ updateMyTour error:', error);
    res.status(500).json({ error: 'Failed to update tour' });
  }
};

// ==========================================
// DELETE /api/v1/tours/:tourId
// Authenticated — delete own tour (sets status inactive)
// ==========================================
export const deleteMyTour = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    if (tour.ownerId?.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own tours' });
    }

    tour.status = 'inactive';
    await tour.save();
    res.json({ message: 'Tour removed' });
  } catch (error: any) {
    console.error('❌ deleteMyTour error:', error);
    res.status(500).json({ error: 'Failed to delete tour' });
  }
};

// ==========================================
// POST /api/v1/tours/:tourId/book
// Authenticated — book a tour, create booking + group trip
// ==========================================
export const bookTour = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { tourId } = req.params;
    const { date, guests = 1 } = req.body;

    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    if (tour.status !== 'active') return res.status(400).json({ error: 'This tour is not currently available' });

    const guestCount = Math.max(1, parseInt(guests, 10) || 1);
    const totalPrice = tour.pricePerPerson * guestCount;

    // Lazily resolve or create the base itinerary so the webhook can reference it
    let itineraryId = tour.baseItineraryId;
    if (!itineraryId) {
      const newItinerary = await Itinerary.create({
        userId,
        title: tour.title,
        city: tour.departureLocation || 'Saudi Arabia',
        estimatedDuration: tour.totalDuration * 60,
        estimatedCost: tour.pricePerPerson,
        distance: 0,
        places: [],
        status: 'published',
      });
      itineraryId = newItinerary._id as any;
      tour.baseItineraryId = itineraryId;
      await tour.save();
    }

    // Create a pending booking — confirmed by the payment webhook on success
    const booking = await Booking.create({
      userId,
      targetType: 'tour',
      targetId: tour._id,
      status: 'pending',
      paymentStatus: 'pending',
      totalPrice,
      bookingDetails: {
        tourId: tour._id,
        tourTitle: tour.title,
        date,
        guests: guestCount,
        pricePerPerson: tour.pricePerPerson,
      },
    });

    // GroupTrip creation, bookingsCount increment, and host notification are handled
    // by the payment webhook once the charge is confirmed.

    res.status(201).json({ booking });
  } catch (error: any) {
    console.error('❌ bookTour error:', error);
    res.status(500).json({ error: 'Failed to complete booking' });
  }
};
