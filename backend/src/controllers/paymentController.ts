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
// POST /api/v1/payments/create-invoice
// ==========================================
export const createInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemType, itemId, quantity = 1, bookingId, cardDetails } = req.body as any;

    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, error: 'itemType and itemId are required.' });
    }

    // Mock: simulate processing delay for the demo presentation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockPaymentId = 'mock_pay_' + Math.random().toString(36).substr(2, 9);
    
    // Save the mock payment ID so verifyPayment can find it
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { providerSessionId: mockPaymentId });
    }

    return res.status(200).json({
      success: true,
      url: `${FRONTEND_URL}/payment-success?id=${mockPaymentId}`,
      paymentId: mockPaymentId
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: 'Payment service error' });
  }
};

// ==========================================
// POST /api/v1/payments/verify  (Moyasar redirect callback — frontend sends { paymentId })
// ==========================================
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  const { paymentId } = req.body as { paymentId?: string };
  if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId is required.' });

  try {
    const booking = await Booking.findOne({ providerSessionId: paymentId });
    
    let itemDetails: any = {
      itemTitle: 'Tripo Experience',
      tourImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80',
      duration: 'Full Day',
      departureLocation: 'Saudi Arabia',
      guests: 1
    };

    if (booking) {
      await Booking.findByIdAndUpdate(booking._id, { 
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      if (booking.targetType === 'tour') {
        const tour = await Tour.findById(booking.targetId);
        if (tour) {
          itemDetails = {
            itemTitle: tour.title,
            tourImage: tour.heroImage,
            duration: `${tour.totalDuration}h`,
            departureLocation: tour.departureLocation,
            guideName: tour.guideName,
            guests: booking.bookingDetails?.guests || 1
          };
        }
      } else if (booking.targetType === 'rental') {
        const rental = await Rental.findById(booking.targetId);
        if (rental) {
           itemDetails = {
             itemTitle: rental.title,
             tourImage: rental.images?.[0] || '',
             duration: 'Reservation',
             departureLocation: rental.locationName
           }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      paid: true, 
      message: 'Payment confirmed.',
      data: {
        amount: booking ? booking.totalPrice : 720,
        currency: 'SAR',
        date: new Date(),
        cardLastFour: '4242',
        ...itemDetails
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Could not verify payment.' });
  }
};

// ==========================================
// POST /api/v1/payments/webhook  (Moyasar webhook — secret_token verified in body)
// Registered BEFORE express.json() in server.ts with express.raw({ type: 'application/json' })
// ==========================================
export const handleMoyasarWebhook = async (req: AuthRequest, res: Response) => {
  // Respond immediately so Moyasar doesn’t retry
  res.status(200).json({ received: true });

  try {
    const { verifyWebhookEvent, handleWebhookEvent } = await import('../services/providers/MoyasarProvider');
    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf8')
      : JSON.stringify(req.body);

    const event = verifyWebhookEvent(rawBody);
    await handleWebhookEvent(event);

    const payment = event.data;
    if (event.type === 'payment_paid') {
      await Payment.findOneAndUpdate({ providerSessionId: payment.id }, { status: 'completed', paidAt: new Date() });
    } else if (event.type === 'payment_refunded') {
      await Payment.findOneAndUpdate({ providerSessionId: payment.id }, { status: 'refunded' });
    } else if (event.type === 'payment_faild' || event.type === 'payment_voided') {
      await Payment.findOneAndUpdate({ providerSessionId: payment.id }, { status: 'failed' });
    }
  } catch (err: any) {
    console.error('[Moyasar webhook error]', err.message);
  }
};

// Kept so server.ts import doesn’t break while it’s being updated
export const handleWebhook = handleMoyasarWebhook;

// ==========================================
// GET /api/v1/payments/history
// ==========================================
export const getPaymentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId;
    const payments = await Payment.find({ userId }).sort({ paidAt: -1 });

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

// ==========================================
// POST /api/v1/payments/mock-pay
// ==========================================
export const mockPay = async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, itemId, quantity = 1, bookingId, cardNumber } = req.body as {
      itemType: 'event' | 'tour' | 'rental';
      itemId: string;
      quantity?: number;
      bookingId?: string;
      cardNumber?: string;
    };

    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, error: 'itemType and itemId are required.' });
    }

    // Basic mock card validation
    const card = (cardNumber || '').replace(/\s/g, '');
    if (!card || card.length < 16) {
      return res.status(400).json({ success: false, error: 'Invalid card number.' });
    }

    const userId = String((req.user as any)?._id || (req.user as any)?.userId || '');

    let itemTitle = '';
    let amountSAR = 0;

    if (itemType === 'event') {
      const event = await Event.findById(itemId);
      if (!event) return res.status(400).json({ success: false, error: 'Event not found.' });
      if (event.isFree) return res.status(400).json({ success: false, error: 'This event is free.' });
      itemTitle = event.title;
      amountSAR = event.fee || 0;
    } else if (itemType === 'tour') {
      const tour = await Tour.findById(itemId);
      if (!tour) return res.status(400).json({ success: false, error: 'Tour not found.' });
      itemTitle = tour.title;
      amountSAR = ((tour as any).pricePerPerson || 0) * quantity * (1 + SERVICE_FEE_RATE + VAT_RATE);
    } else if (itemType === 'rental') {
      const rental = await Rental.findById(itemId);
      if (!rental) return res.status(400).json({ success: false, error: 'Rental not found.' });
      itemTitle = rental.title;
      amountSAR = ((rental as any).price || 0) * (1 + SERVICE_FEE_RATE + VAT_RATE);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid itemType.' });
    }

    if (amountSAR <= 0) {
      return res.status(400).json({ success: false, error: 'Item price must be greater than 0.' });
    }

    // Generate a mock payment ID
    const mockPaymentId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const session = await mongoose.startSession();
    let payment: any;

    await session.withTransaction(async () => {
      [payment] = await Payment.create([{
        userId,
        itemType,
        itemId,
        bookingId: bookingId ? new Types.ObjectId(bookingId) : undefined,
        amount: amountSAR,
        currency: 'SAR',
        provider: 'mock',
        providerSessionId: mockPaymentId,
        paymentIntentId: mockPaymentId,
        status: 'completed',
        paidAt: new Date(),
        metadata: { userId, itemType, itemId, ...(bookingId ? { bookingId } : {}) },
      }], { session });

      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          paymentStatus: 'paid',
          status: 'confirmed',
          providerSessionId: mockPaymentId,
          paymentId: payment._id,
        }, { session });
      }

      const user = await User.findById(userId).session(session);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + (amountSAR * 0.10);
        await user.save({ session });
        await Notification.create([{
          userId,
          type: 'payment_received',
          payload: {
            itemType,
            itemId,
            amount: amountSAR,
            currency: 'SAR',
            title: 'Payment Successful',
            message: `Your payment of ${amountSAR.toFixed(2)} SAR for ${itemTitle} was successful.`,
          },
          read: false,
        }], { session });
      }
    });

    session.endSession();

    // Enrich with item details for the success receipt UI
    let itemDetails: any = {};
    if (itemType === 'tour') {
      const tour = await Tour.findById(itemId).select('heroImage departureLocation guideName difficulty totalDuration');
      if (tour) {
        itemDetails = {
          tourImage: tour.heroImage,
          departureLocation: tour.departureLocation,
          guideName: tour.guideName,
          difficulty: tour.difficulty,
          duration: `${tour.totalDuration}h`,
        };
      }
    } else if (itemType === 'rental') {
      const rental = await Rental.findById(itemId).select('images locationName');
      if (rental) {
        itemDetails = {
          tourImage: rental.images?.[0] || '',
          departureLocation: rental.locationName,
          duration: 'Reservation',
        };
      }
    }

    return res.status(200).json({
      success: true,
      paid: true,
      mockPaymentId,
      message: 'Mock payment successful.',
      data: {
        amount: amountSAR,
        currency: 'SAR',
        itemType,
        itemId,
        itemTitle,
        bookingId,
        date: new Date(),
        guests: quantity,
        ...itemDetails
      }
    });

  } catch (error: any) {
    console.error(`❌ [MockPayment] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Payment failed. Please try again.' });
  }
};
