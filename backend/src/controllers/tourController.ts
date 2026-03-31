import { Response } from 'express';
import { AuthRequest } from '../types';
import { Tour } from '../models/Tour';
import { GroupTrip, Booking, Itinerary } from '../models';

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

    const tours = await Tour.find(filter).sort({ bookingsCount: -1, rating: -1 });
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
// Admin only — create a new tour
// ==========================================
export const createTour = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tour = await Tour.create(req.body);
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
// POST /api/v1/tours/:tourId/book
// Authenticated — book a tour, create booking + group trip
// ==========================================
export const bookTour = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { tourId } = req.params;
    const { date, guests = 1, paymentDetails } = req.body;

    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    if (tour.status !== 'active') return res.status(400).json({ error: 'This tour is not currently available' });

    const guestCount = Math.max(1, parseInt(guests, 10) || 1);
    const totalPrice = tour.pricePerPerson * guestCount;

    // Resolve or create the base itinerary
    let itineraryId = tour.baseItineraryId;

    if (!itineraryId) {
      // Create a minimal itinerary for this tour
      const newItinerary = await Itinerary.create({
        userId,
        title: tour.title,
        city: tour.departureLocation || 'Saudi Arabia',
        estimatedDuration: tour.totalDuration * 60, // convert hours to minutes
        estimatedCost: tour.pricePerPerson,
        distance: 0,
        places: [],
        status: 'published',
      });
      itineraryId = newItinerary._id as any;

      // Persist the itinerary reference on the tour for future bookings
      tour.baseItineraryId = itineraryId;
      await tour.save();
    }

    // Create booking record
    const booking = await Booking.create({
      userId,
      targetType: 'tour',
      targetId: tour._id,
      status: 'confirmed',
      paymentStatus: 'paid',
      totalPrice,
      bookingDetails: {
        tourId: tour._id,
        tourTitle: tour.title,
        date,
        guests: guestCount,
        pricePerPerson: tour.pricePerPerson,
        paymentDetails: paymentDetails || {},
      },
    });

    // Create group trip
    const bookingDate = date ? new Date(date) : undefined;
    const groupTrip = await GroupTrip.create({
      organizerId: userId,
      baseItineraryId: itineraryId,
      title: `${tour.title}${date ? ` — ${new Date(date).toLocaleDateString('en-SA', { day: 'numeric', month: 'short' })}` : ''}`,
      description: tour.description,
      coverImage: tour.heroImage,
      startDate: bookingDate,
      estimatedBudget: totalPrice,
      memberIds: [userId],
      status: 'planning',
    });

    // Increment booking counter on tour
    await Tour.findByIdAndUpdate(tourId, { $inc: { bookingsCount: 1 } });

    res.status(201).json({ booking, groupTrip });
  } catch (error: any) {
    console.error('❌ bookTour error:', error);
    res.status(500).json({ error: 'Failed to complete booking' });
  }
};
