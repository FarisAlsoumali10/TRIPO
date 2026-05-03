import Stripe from 'stripe';
import {
  IPaymentProvider,
  CreateSessionInput,
  CreateSessionResult,
  WebhookEvent,
  RefundInput,
} from '../../interfaces/IPaymentProvider';

const getStripe = (): Stripe => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
};

export class StripeProvider implements IPaymentProvider {
  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: input.customerEmail,
      line_items: [
        {
          price_data: {
            currency: input.currency,
            product_data: { name: input.itemTitle },
            unit_amount: input.amountInSubunit,
          },
          quantity: input.quantity,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    });

    return {
      sessionId: session.id,
      redirectUrl: session.url!,
      provider: 'stripe',
    };
  }

  async verifyWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const stripeEvent = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      const s = stripeEvent.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment.completed',
        providerEventType: stripeEvent.type,
        sessionId: s.id,
        paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id,
        metadata: (s.metadata as Record<string, string>) || {},
        amountTotal: s.amount_total ?? 0,
      };
    }

    if (stripeEvent.type === 'checkout.session.expired') {
      const s = stripeEvent.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment.expired',
        providerEventType: stripeEvent.type,
        sessionId: s.id,
        metadata: (s.metadata as Record<string, string>) || {},
      };
    }

    if (stripeEvent.type === 'checkout.session.async_payment_failed') {
      const s = stripeEvent.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment.failed',
        providerEventType: stripeEvent.type,
        sessionId: s.id,
        metadata: (s.metadata as Record<string, string>) || {},
      };
    }

    if (stripeEvent.type === 'charge.refunded') {
      const charge = stripeEvent.data.object as Stripe.Charge;
      return {
        type: 'refund.completed',
        providerEventType: stripeEvent.type,
        paymentIntentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id,
        refundedAmount: charge.amount_refunded,
      };
    }

    return {
      type: 'unknown',
      providerEventType: stripeEvent.type,
    };
  }

  async refund(input: RefundInput): Promise<void> {
    await getStripe().refunds.create({
      payment_intent: input.paymentIntentId,
      ...(input.amountInSubunit ? { amount: input.amountInSubunit } : {}),
      reason: (input.reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
    });
  }
}
