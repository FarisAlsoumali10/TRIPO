import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Event } from '../models/Event';
import { Tour } from '../models/Tour';
import { Rental } from '../models/Rental';
import { Payment } from '../models/Payment';
import { Booking } from '../models/Booking';
import { GroupTrip } from '../models/GroupTrip';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { PaymentService } from '../services/PaymentService';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE || '0.10');
const SERVICE_FEE_RATE = parseFloat(process.env.SERVICE_FEE_RATE || '0.05');
const VAT_RATE = parseFloat(process.env.VAT_RATE || '0.15');

// ==========================================
// POST /api/v1/payments/create-checkout-session
// ==========================================
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemType, itemId, quantity = 1, bookingId } = req.body as {
      itemType: 'event' | 'tour' | 'rental';
      itemId: string;
      quantity?: number;
      bookingId?: string;
    };

    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, error: 'itemType and itemId are required.' });
    }

    const userId = String((req.user as any)?._id || (req.user as any)?.userId || '');

    // If a bookingId is supplied, verify it belongs to this user and matches the item
    if (bookingId) {
      const booking = await Booking.findOne({ _id: bookingId, userId });
      if (!booking) {
        return res.status(400).json({ success: false, error: 'Booking not found or does not belong to you.' });
      }
      if (booking.targetId.toString() !== itemId) {
        return res.status(400).json({ success: false, error: 'Booking does not match the supplied item.' });
      }
      if ((booking as any).targetType && (booking as any).targetType !== itemType) {
        return res.status(400).json({ success: false, error: 'Booking type does not match the supplied item type.' });
      }
    }

    let itemTitle = '';
    let amountInSubunit = 0;

    if (itemType === 'event') {
      const event = await Event.findById(itemId);
      if (!event) return res.status(400).json({ success: false, error: 'Event not found.' });
      if (event.isFree) return res.status(400).json({ success: false, error: 'This event is free and does not require payment.' });
      itemTitle = event.title;
      amountInSubunit = Math.round((event.fee || 0) * 100);

    } else if (itemType === 'tour') {
      const tour = await Tour.findById(itemId);
      if (!tour) return res.status(400).json({ success: false, error: 'Tour not found.' });
      itemTitle = tour.title;
      const tourBase = ((tour as any).pricePerPerson || 0) * quantity;
      amountInSubunit = Math.round(tourBase * (1 + SERVICE_FEE_RATE + VAT_RATE) * 100);

    } else if (itemType === 'rental') {
      const rental = await Rental.findById(itemId);
      if (!rental) return res.status(400).json({ success: false, error: 'Rental not found.' });
      itemTitle = rental.title;
      const rentalBase = (rental as any).price || 0;
      amountInSubunit = Math.round(rentalBase * (1 + SERVICE_FEE_RATE + VAT_RATE) * 100);

    } else {
      return res.status(400).json({ success: false, error: 'Invalid itemType.' });
    }

    if (amountInSubunit <= 0) {
      return res.status(400).json({ success: false, error: 'Item price must be greater than 0.' });
    }

    const result = await PaymentService.createSession({
      itemTitle,
      amountInSubunit,
      currency: 'sar',
      quantity: 1,  // amount already multiplied above
      customerEmail: (req.user as any)?.email,
      successUrl: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:  `${FRONTEND_URL}/payment-cancelled`,
      metadata: {
        userId,
        itemType,
        itemId,
        ...(bookingId ? { bookingId } : {}),
      },
    });

    // Persist the session ID on the booking so the webhook can find it
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { providerSessionId: result.sessionId });
    }

    return res.status(200).json({ success: true, url: result.redirectUrl });

  } catch (error: any) {
    console.error(`❌ [Payment] Checkout session error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Payment service error. Please try again.' });
  }
};

// ==========================================
// POST /api/v1/payments/webhook  (raw body only — mounted before express.json in server.ts)
// ==========================================
export const handleWebhook = async (req: AuthRequest, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = await PaymentService.verifyWebhook(req.body as Buffer, signature);
  } catch (err: any) {
    console.error(`⚠️ [Payment Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'payment.completed') {
      const { userId, itemType, itemId, bookingId } = (event.metadata || {}) as {
        userId: string;
        itemType: 'event' | 'tour' | 'rental';
        itemId: string;
        bookingId?: string;
      };

      // Idempotency: skip if we already processed this session
      const existing = await Payment.findOne({ providerSessionId: event.sessionId });
      if (existing) {
        console.log(`[Payment Webhook] Duplicate event for session ${event.sessionId} — skipping`);
        return res.status(200).json({ received: true });
      }

      const amountInSAR = (event.amountTotal || 0) / 100;

      // Wrap all DB writes in a transaction so a mid-flight error leaves nothing half-written
      const session = await mongoose.startSession();
      let payment: any;
      await session.withTransaction(async () => {
        // Create the Payment record
        [payment] = await Payment.create([{
          userId,
          itemType,
          itemId,
          bookingId: bookingId ? new Types.ObjectId(bookingId) : undefined,
          amount: amountInSAR,
          currency: 'SAR',
          provider: 'stripe',
          providerSessionId: event.sessionId,
          paymentIntentId: event.paymentIntentId,
          status: 'completed',
          paidAt: new Date(),
        }], { session });

        // Flip the booking to confirmed
        if (bookingId) {
          await Booking.findByIdAndUpdate(bookingId, {
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentId: payment._id,
          }, { session });
        }

        // Item-specific side effects
        if (itemType === 'event') {
          await Event.findByIdAndUpdate(itemId, {
            $addToSet: { attendees: userId },
            $inc: { attendeesCount: 1 },
          }, { session });

        } else if (itemType === 'tour' && bookingId) {
          const booking = await Booking.findById(bookingId).session(session);
          const tour = await Tour.findById(itemId).session(session);

          if (booking && tour) {
            const { date, guests } = booking.bookingDetails || {};
            const bookingDate = date ? new Date(date) : undefined;

            await GroupTrip.create([{
              organizerId: userId,
              baseItineraryId: tour.baseItineraryId,
              title: `${tour.title}${date ? ` — ${new Date(date).toLocaleDateString('en-SA', { day: 'numeric', month: 'short' })}` : ''}`,
              description: (tour as any).description,
              coverImage: (tour as any).heroImage,
              startDate: bookingDate,
              estimatedBudget: amountInSAR,
              memberIds: [userId],
              status: 'planning',
            }], { session });

            await Tour.findByIdAndUpdate(itemId, { $inc: { bookingsCount: 1 } }, { session });

            // Notify tour owner
            if (tour.ownerId && tour.ownerId.toString() !== userId) {
              const io = (req as any).app?.get('io');
              const payload = {
                bookingId,
                tourId: tour._id,
                tourTitle: (tour as any).title,
                guestId: userId,
                date,
                guests,
                totalPrice: amountInSAR,
              };
              await Notification.create([{ userId: tour.ownerId, type: 'new_booking_tour', payload, read: false }], { session });
              if (io) io.to(`user:${tour.ownerId.toString()}`).emit('notification', { type: 'new_booking_tour', payload });
            }
          }

        } else if (itemType === 'rental' && bookingId) {
          const booking = await Booking.findById(bookingId).session(session);
          const rental = await Rental.findById(itemId).session(session);

          if (booking && rental && (rental as any).hostId) {
            const hostId = (rental as any).hostId;
            const io = (req as any).app?.get('io');
            const payload = { bookingId, rentalId: rental._id, rentalTitle: rental.title, guestId: userId, totalPrice: amountInSAR };
            await Notification.create([{ userId: hostId, type: 'new_booking', payload, read: false }], { session });
            if (io) io.to(`user:${hostId.toString()}`).emit('notification', { type: 'new_booking', payload });
          }
        }

        // Credit host wallet and notify host (runs within transaction)
        await _creditHostWalletInSession(itemType, itemId, amountInSAR, req, session);

        // Notify buyer
        const io = (req as any).app?.get('io');
        const buyerPayload = { itemType, itemId, amount: amountInSAR, currency: 'SAR', bookingId };
        await Notification.create([{ userId, type: 'payment_received', payload: buyerPayload, read: false }], { session });
        if (io) io.to(`user:${userId}`).emit('notification', { type: 'payment_received', payload: buyerPayload });
      });
      await session.endSession();

      console.log(`✅ Payment completed for ${itemType} ${itemId} by user ${userId}`);

    } else if (event.type === 'payment.expired') {
      const { bookingId: expiredBookingId } = (event.metadata || {}) as { bookingId?: string };
      if (expiredBookingId) {
        await Booking.findByIdAndUpdate(expiredBookingId, { status: 'cancelled' });
        console.log(`⚠️ [Payment Webhook] Cancelled booking ${expiredBookingId} due to expired session ${event.sessionId}`);
      } else {
        console.log(`⚠️ [Payment Webhook] Session expired (no booking): ${event.sessionId}`);
      }

    } else if (event.type === 'payment.failed') {
      const { userId: failUserId, bookingId: failBookingId } = (event.metadata || {}) as { userId?: string; bookingId?: string };
      if (failBookingId) {
        await Booking.findByIdAndUpdate(failBookingId, { paymentStatus: 'pending' });
      }
      if (failUserId) {
        const io = (req as any).app?.get('io');
        const payload = { bookingId: failBookingId };
        await Notification.create({ userId: failUserId, type: 'payment_failed', payload, read: false });
        if (io) io.to(`user:${failUserId}`).emit('notification', { type: 'payment_failed', payload });
      }
      console.log(`⚠️ [Payment Webhook] Payment failed: ${event.sessionId}`);

    } else if (event.type === 'refund.completed') {
      const payment = await Payment.findOneAndUpdate(
        { paymentIntentId: event.paymentIntentId },
        { status: 'refunded' },
        { new: true },
      );
      if (payment?.bookingId) {
        await Booking.findByIdAndUpdate(payment.bookingId, {
          status: 'cancelled',
          paymentStatus: 'refunded',
        });
        // Notify the buyer
        const io = (req as any).app?.get('io');
        const refundUserId = payment.userId?.toString();
        const payload = { bookingId: payment.bookingId, amount: payment.amount, currency: payment.currency };
        await Notification.create({ userId: refundUserId, type: 'refund_issued', payload, read: false });
        if (io && refundUserId) io.to(`user:${refundUserId}`).emit('notification', { type: 'refund_issued', payload });
      }
      console.log(`↩️ [Payment Webhook] Refund completed for intent: ${event.paymentIntentId}`);

    } else {
      console.log(`[Payment Webhook] Unhandled event: ${event.providerEventType}`);
    }

  } catch (err: any) {
    console.error(`❌ [Payment Webhook] Error processing ${event.providerEventType}: ${err.message}`);
  }

  return res.status(200).json({ received: true });
};

// ==========================================
// GET /api/v1/payments/verify?session_id=xxx
// ==========================================
export const verifySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'session_id is required.' });
    }

    const payment = await Payment.findOne({ providerSessionId: sessionId });
    if (!payment) {
      return res.status(200).json({ success: true, paid: false, booking: null, payment: null });
    }

    const booking = payment.bookingId
      ? await Booking.findById(payment.bookingId)
      : null;

    return res.status(200).json({ success: true, paid: payment.status === 'completed', booking, payment });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/v1/payments/history
// ==========================================
export const getPaymentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payments = await Payment.find({ userId: (req.user as any)?._id })
      .sort({ paidAt: -1 });

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Internal: credit the host's wallet within an existing Mongoose session
// ==========================================
async function _creditHostWalletInSession(
  itemType: 'event' | 'tour' | 'rental',
  itemId: string,
  amountInSAR: number,
  req: AuthRequest,
  dbSession: mongoose.ClientSession,
) {
  let hostId: Types.ObjectId | undefined;
  let hostShare = 0;

  if (itemType === 'tour') {
    const tour = await Tour.findById(itemId).select('ownerId commissionRate').session(dbSession);
    hostId = tour?.ownerId as Types.ObjectId | undefined;
    const fee = (tour as any)?.commissionRate ?? PLATFORM_FEE_RATE;
    hostShare = amountInSAR * (1 - fee);
  } else if (itemType === 'rental') {
    const rental = await Rental.findById(itemId).select('hostId commissionRate').session(dbSession);
    hostId = (rental as any)?.hostId as Types.ObjectId | undefined;
    const fee = (rental as any)?.commissionRate ?? PLATFORM_FEE_RATE;
    hostShare = amountInSAR * (1 - fee);
  }

  if (hostId && hostShare > 0) {
    await User.findByIdAndUpdate(hostId, { $inc: { walletBalance: hostShare } }, { session: dbSession });

    const io = (req as any).app?.get('io');
    const payload = { itemType, itemId, amount: hostShare, currency: 'SAR' };
    await Notification.create([{ userId: hostId, type: 'payout_credited', payload, read: false }], { session: dbSession });
    if (io) io.to(`user:${hostId.toString()}`).emit('notification', { type: 'payout_credited', payload });
  }
}
