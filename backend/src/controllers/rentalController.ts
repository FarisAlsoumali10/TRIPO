import { Request, Response } from 'express';
import { Rental } from '../models/Rental';
import { Booking } from '../models/Booking';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../types';

export const getAllRentals = async (req: Request, res: Response) => {
  try {
    const rentals = await Rental.find({ active: { $ne: false } }).lean();
    return res.status(200).json({ success: true, count: rentals.length, data: rentals });
  } catch (error: any) {
    console.error('❌ Error fetching rentals:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findById(req.params.rentalId).lean();
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    return res.status(200).json({ success: true, data: rental });
  } catch (error: any) {
    console.error('❌ Error fetching rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getMyRentals = async (req: AuthRequest, res: Response) => {
  try {
    const rentals = await Rental.find({ hostId: req.user?.userId }).lean();
    return res.status(200).json({ success: true, count: rentals.length, data: rentals });
  } catch (error: any) {
    console.error('❌ Error fetching host rentals:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const createRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.create({ ...req.body, hostId: req.user?.userId });
    return res.status(201).json({ success: true, data: rental });
  } catch (error: any) {
    console.error('❌ Error creating rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const updateRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findById(req.params.rentalId);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    const isOwner = rental.hostId?.toString() === req.user?.userId;
    const isAdmin = (req.user as any)?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const updated = await Rental.findByIdAndUpdate(req.params.rentalId, req.body, {
      new: true,
      runValidators: true,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('❌ Error updating rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const deleteRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findById(req.params.rentalId);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }
    const isOwner = rental.hostId?.toString() === req.user?.userId;
    const isAdmin = (req.user as any)?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await Rental.findByIdAndDelete(req.params.rentalId);
    return res.status(200).json({ success: true, data: {} });
  } catch (error: any) {
    console.error('❌ Error deleting rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const bookRental = async (req: AuthRequest, res: Response) => {
  try {
    const rental = await Rental.findById(req.params.rentalId);
    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    const { date, nightsOrHours = 1, slot, totalPrice } = req.body;
    const price = totalPrice ?? (rental.price * (nightsOrHours || 1));

    // Persist the booking
    const booking = await Booking.create({
      userId:     req.user?.userId,
      targetType: 'rental',
      targetId:   rental._id,
      status:     'pending',
      paymentStatus: 'pending',
      totalPrice: price,
      bookingDetails: { date, nightsOrHours, slot, rentalTitle: rental.title, locationName: rental.locationName },
    });

    // Notify the host if the rental has an owner
    if (rental.hostId) {
      const payload = {
        bookingId:    booking._id,
        rentalId:     rental._id,
        rentalTitle:  rental.title,
        guestId:      req.user?.userId,
        date,
        nights:       nightsOrHours,
        totalPrice:   price,
      };

      await Notification.create({
        userId:  rental.hostId,
        type:    'new_booking',
        payload,
        read:    false,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${rental.hostId.toString()}`).emit('notification', {
          type:    'new_booking',
          payload,
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Rental successfully booked', data: booking });
  } catch (error: any) {
    console.error('❌ Error booking rental:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getMyRentalBookings = async (req: AuthRequest, res: Response) => {
  try {
    // Find all rentals owned by this host
    const myRentals = await Rental.find({ hostId: req.user?.userId }).select('_id title').lean();
    const rentalIds = myRentals.map(r => r._id);

    // Fetch all bookings for those rentals, newest first, populated with guest info
    const bookings = await Booking.find({ targetType: 'rental', targetId: { $in: rentalIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatar email')
      .lean();

    // Attach rental title to each booking
    const rentalMap = Object.fromEntries(myRentals.map(r => [r._id.toString(), (r as any).title]));
    const enriched = bookings.map(b => ({
      ...b,
      rentalTitle: rentalMap[b.targetId.toString()] ?? b.bookingDetails?.rentalTitle,
    }));

    return res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error: any) {
    console.error('❌ Error fetching host bookings:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
