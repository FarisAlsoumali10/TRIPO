// backend/src/controllers/paymentController.ts

import { Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../types';
import { Event } from '../models/Event';
import { Tour } from '../models/Tour';
import { Rental } from '../models/Rental';
import { Payment } from '../models/Payment';

// ==========================================
// 🔑 Stripe Initialisation
// ==========================================
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY is not set. Payment features will be non-functional.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ==========================================
// 💳 POST /api/v1/payments/create-checkout-session
// ==========================================
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemType, itemId, quantity = 1 } = req.body as {
      itemType: 'event' | 'tour' | 'rental';
      itemId: string;
      quantity?: number;
    };

    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, error: 'itemType and itemId are required.' });
    }

    let itemTitle = '';
    let amountInHalalas = 0;

    if (itemType === 'event') {
      const event = await Event.findById(itemId);
      if (!event) return res.status(400).json({ success: false, error: 'Event not found.' });
      if ((event as any).isFree) return res.status(400).json({ success: false, error: 'This event is free and does not require payment.' });
      itemTitle = event.title;
      amountInHalalas = Math.round(((event as any).fee || 0) * 100);

    } else if (itemType === 'tour') {
      const tour = await Tour.findById(itemId);
      if (!tour) return res.status(400).json({ success: false, error: 'Tour not found.' });
      itemTitle = tour.title;
      amountInHalalas = Math.round(((tour as any).pricePerPerson || 0) * 100);

    } else if (itemType === 'rental') {
      const rental = await Rental.findById(itemId);
      if (!rental) return res.status(400).json({ success: false, error: 'Rental not found.' });
      itemTitle = rental.title;
      amountInHalalas = Math.round(((rental as any).price || 0) * 100);

    } else {
      return res.status(400).json({ success: false, error: 'Invalid itemType.' });
    }

    if (amountInHalalas <= 0) {
      return res.status(400).json({ success: false, error: 'Item price must be greater than 0.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'] as const,
      customer_email: (req.user as any)?.email,
      line_items: [
        {
          price_data: {
            currency: 'sar',
            product_data: { name: itemTitle },
            unit_amount: amountInHalalas,
          },
          quantity,
        },
      ],
      success_url: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/payment-cancelled`,
      metadata: {
        userId: String((req.user as any)?._id || ''),
        itemType,
        itemId,
      },
    });

    return res.status(200).json({ success: true, url: session.url });

  } catch (error: any) {
    if (error?.type?.startsWith('Stripe')) {
      console.error(`❌ [Stripe] Checkout session error: ${error.message}`);
      return res.status(500).json({ success: false, error: 'Payment service error. Please try again.' });
    }
    next(error);
  }
};

// ==========================================
// 🔒 POST /api/v1/payments/webhook  (raw body only!)
// ==========================================
export const handleStripeWebhook = async (req: AuthRequest, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  // FIX line 130 — use `| undefined` instead of `!` assertion;
  // the guard below satisfies TypeScript without relying on strict-mode exceptions
  let stripeEvent: Stripe.Event | undefined;

  try {
    stripeEvent = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️ [Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Guard — TypeScript now knows stripeEvent is Stripe.Event below this line
  if (!stripeEvent) {
    return res.status(400).json({ error: 'Could not parse webhook event.' });
  }

  const eventType = stripeEvent.type;

  // FIX lines 147 & 178 — replace switch/const session with if/else + unique
  // variable names (completedSession / expiredSession) so the same `const session`
  // name never appears twice in the same function scope
  try {
    if (eventType === 'checkout.session.completed') {
      const completedSession = stripeEvent.data.object as Stripe.Checkout.Session;

      const { userId, itemType, itemId } = (completedSession.metadata || {}) as {
        userId: string;
        itemType: 'event' | 'tour' | 'rental';
        itemId: string;
      };

      if (itemType === 'event' && userId && itemId) {
        await Event.findByIdAndUpdate(itemId, {
          $addToSet: { attendees: userId },
          $inc: { attendeesCount: 1 },
        });
      }

      const amountInSAR = (completedSession.amount_total || 0) / 100;
      await Payment.create({
        userId,
        itemType,
        itemId,
        amount: amountInSAR,
        currency: 'SAR',
        stripeSessionId: completedSession.id,
        status: 'completed',
        paidAt: new Date(),
      });

      console.log(`✅ Payment completed for ${itemType} ${itemId} by user ${userId}`);

    } else if (eventType === 'checkout.session.expired') {
      const expiredSession = stripeEvent.data.object as Stripe.Checkout.Session;
      console.log(`⚠️ Session expired: ${expiredSession.id}`);

    }
    // All other event types are silently ignored

  } catch (err: any) {
    // Log but still return 200 — Stripe retries any non-2xx for up to 72 hours
    console.error(`❌ [Stripe Webhook] Error processing event ${eventType}: ${err.message}`);
  }

  return res.status(200).json({ received: true });
};

// ==========================================
// 📜 GET /api/v1/payments/history
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