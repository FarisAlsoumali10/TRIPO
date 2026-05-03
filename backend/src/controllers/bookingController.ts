import { Response } from 'express';
import { AuthRequest } from '../types';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { Tour } from '../models/Tour';
import { Rental } from '../models/Rental';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { PaymentService } from '../services/PaymentService';

const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE || '0.10');

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const details = b.bookingDetails || {};

        if (b.targetType === 'tour') {
          const tour = await Tour.findById(b.targetId).select(
            'title heroImage guideName guideAvatar departureLocation totalDuration'
          );
          return {
            id: b._id,
            tourId: String(b.targetId),
            tourTitle: tour?.title || details.tourTitle || 'Tour',
            tourImage: tour?.heroImage || '',
            guideName: tour?.guideName || 'Guide',
            guideAvatar: tour?.guideAvatar,
            date: details.date || '',
            guests: details.guests || 1,
            totalPrice: b.totalPrice,
            currency: 'SAR',
            status: b.status,
            paymentStatus: b.paymentStatus,
            departureLocation: tour?.departureLocation || '',
            duration: tour?.totalDuration || 0,
            bookedAt: new Date(b.createdAt).getTime(),
          };
        }

        if (b.targetType === 'rental') {
          const rental = await Rental.findById(b.targetId).select(
            'title images image locationName'
          );
          return {
            id: b._id,
            tourId: String(b.targetId),
            tourTitle: rental?.title || details.rentalTitle || 'Rental',
            tourImage: rental?.images?.[0] || (rental as any)?.image || '',
            guideName: rental?.locationName || '',
            date: details.date || '',
            guests: details.nightsOrHours || 1,
            totalPrice: b.totalPrice,
            currency: 'SAR',
            status: b.status,
            paymentStatus: b.paymentStatus,
            departureLocation: rental?.locationName || '',
            duration: details.nightsOrHours || 1,
            bookedAt: new Date(b.createdAt).getTime(),
          };
        }

        return {
          id: b._id,
          tourId: String(b.targetId),
          tourTitle: details.tourTitle || details.rentalTitle || 'Booking',
          tourImage: '',
          guideName: '',
          date: details.date || '',
          guests: details.guests || details.nightsOrHours || 1,
          totalPrice: b.totalPrice,
          currency: 'SAR',
          status: b.status,
          paymentStatus: b.paymentStatus,
          departureLocation: '',
          duration: 0,
          bookedAt: new Date(b.createdAt).getTime(),
        };
      })
    );

    res.json({ bookings: enriched });
  } catch (error: any) {
    console.error('❌ getMyBookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const cancelMyBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await Booking.findOne({ _id: req.params.id, userId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    // If the booking was paid, issue a refund through the payment provider
    if (booking.paymentStatus === 'paid' && booking.paymentId) {
      const payment = await Payment.findById(booking.paymentId);

      if (payment?.paymentIntentId) {
        try {
          await PaymentService.refund({
            paymentIntentId: payment.paymentIntentId,
            reason: 'requested_by_customer',
          });
          await Payment.findByIdAndUpdate(payment._id, { status: 'refunded' });
        } catch (refundErr: any) {
          console.error(`❌ Refund failed for booking ${booking._id}: ${refundErr.message}`);
          return res.status(500).json({ error: 'Refund failed. Please contact support.' });
        }

        // Reverse the host's wallet credit
        const amountInSAR = payment.amount;
        if (booking.targetType === 'tour') {
          const tour = await Tour.findById(booking.targetId).select('ownerId commissionRate');
          if (tour?.ownerId) {
            const fee = (tour as any).commissionRate ?? PLATFORM_FEE_RATE;
            await User.findByIdAndUpdate(tour.ownerId, {
              $inc: { walletBalance: -(amountInSAR * (1 - fee)) },
            });
          }
        } else if (booking.targetType === 'rental') {
          const rental = await Rental.findById(booking.targetId).select('hostId commissionRate');
          if ((rental as any)?.hostId) {
            const fee = (rental as any).commissionRate ?? PLATFORM_FEE_RATE;
            await User.findByIdAndUpdate((rental as any).hostId, {
              $inc: { walletBalance: -(amountInSAR * (1 - fee)) },
            });
          }
        }

        booking.paymentStatus = 'refunded';
      }
    }

    booking.status = 'cancelled';
    await booking.save();

    // Notify host of cancellation
    const io = (req as any).app?.get('io');
    if (booking.targetType === 'tour') {
      const tour = await Tour.findById(booking.targetId).select('ownerId title');
      if (tour?.ownerId && tour.ownerId.toString() !== userId) {
        const payload = { bookingId: booking._id, tourTitle: (tour as any).title, guestId: userId };
        await Notification.create({ userId: tour.ownerId, type: 'booking_cancelled', payload, read: false });
        if (io) io.to(`user:${tour.ownerId.toString()}`).emit('notification', { type: 'booking_cancelled', payload });
      }
    } else if (booking.targetType === 'rental') {
      const rental = await Rental.findById(booking.targetId).select('hostId title');
      if ((rental as any)?.hostId) {
        const payload = { bookingId: booking._id, rentalTitle: rental?.title, guestId: userId };
        await Notification.create({ userId: (rental as any).hostId, type: 'booking_cancelled', payload, read: false });
        if (io) io.to(`user:${(rental as any).hostId.toString()}`).emit('notification', { type: 'booking_cancelled', payload });
      }
    }

    res.json({ success: true, status: booking.status, paymentStatus: booking.paymentStatus });
  } catch (error: any) {
    console.error('❌ cancelMyBooking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};
