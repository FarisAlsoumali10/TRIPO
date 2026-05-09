import axios from 'axios';
import crypto from 'crypto';

// ─── Moyasar Types ────────────────────────────────────────────────────────────

export type MoyasarPaymentStatus =
  | 'initiated'
  | 'paid'
  | 'authorized'
  | 'failed'
  | 'refunded'
  | 'captured'
  | 'voided'
  | 'verified';

export type MoyasarSourceType =
  | 'creditcard'
  | 'applepay'
  | 'samsungpay'
  | 'stcpay'
  | 'token';

export type MoyasarRefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer';

export interface MoyasarSource {
  type: MoyasarSourceType;
  company?: string;
  name?: string;
  number?: string;
  message?: string;
  transaction_url?: string;
  reference_number?: string;
  gateway_id?: string;
  token?: string;
}

export interface MoyasarPayment {
  id: string;
  status: MoyasarPaymentStatus;
  amount: number;         // in halalat (1 SAR = 100 halalat)
  fee: number;
  currency: string;
  refunded: number;
  captured: number;
  description?: string;
  amount_format: string;
  callback_url?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string>;
  source: MoyasarSource;
}

export interface MoyasarWebhookEvent {
  id: string;
  type:
    | 'payment_paid'
    | 'payment_faild'      // Moyasar API typo — intentional, matches their docs
    | 'payment_refunded'
    | 'payment_voided'
    | 'payment_authorized'
    | 'payment_captured'
    | 'payment_verified';
  created_at: string;
  secret_token: string;
  account_name: string;
  live: boolean;
  data: MoyasarPayment;
}

export interface CreatePaymentInput {
  /** Amount in SAR (e.g. 99.50) — converted to halalat automatically */
  amountSAR: number;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
  sourceType?: MoyasarSourceType;
  /** Required for token source */
  cardToken?: string;
  /** Required for raw creditcard source */
  card?: {
    name: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
  };
}

export interface RefundPaymentInput {
  paymentId?: string;
  paymentIntentId?: string; // Alias for controller compatibility
  /** Amount in SAR — omit for full refund */
  amountSAR?: number;
  reason?: MoyasarRefundReason;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const API_URL = process.env.MOYASAR_API_URL ?? 'https://api.moyasar.com/v1';

const authHeader = (): string => {
  const key = process.env.MOYASAR_SECRET_KEY ?? '';
  if (!key) throw new Error('MOYASAR_SECRET_KEY is not configured.');
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
};

/** SAR → halalat */
const toHalalat = (sar: number): number => Math.round(sar * 100);

// ─── Create Payment ───────────────────────────────────────────────────────────

/**
 * Initiates a Moyasar payment.
 * For creditcard flow Moyasar returns `source.transaction_url` (status = "initiated").
 * Redirect the user there to complete 3-D Secure; Moyasar will then redirect back
 * to `callbackUrl?id=<payment_id>&status=<paid|failed>`.
 *
 * Docs: https://docs.moyasar.com/api/payments/01-create-payment
 */
export const createPayment = async (
  input: CreatePaymentInput,
): Promise<MoyasarPayment> => {
  const { amountSAR, description, callbackUrl, metadata, sourceType, cardToken, card } = input;

  const source: Record<string, unknown> =
    sourceType === 'stcpay'   ? { type: 'stcpay' }
    : cardToken               ? { type: 'token', token: cardToken }
    : card                    ? { type: 'creditcard', ...card }
    :                           { type: 'creditcard' };

  const { data } = await axios.post<MoyasarPayment>(
    `${API_URL}/payments`,
    {
      amount:       toHalalat(amountSAR),
      currency:     'SAR',
      description,
      callback_url: callbackUrl,
      source,
      ...(metadata ? { metadata } : {}),
    },
    { headers: { Authorization: authHeader(), 'Content-Type': 'application/json' } },
  );

  return data;
};

// ─── Fetch Payment ────────────────────────────────────────────────────────────

/**
 * Fetches a payment by ID for server-side verification.
 * Call this after the user returns from `transaction_url`.
 */
export const getPayment = async (paymentId: string): Promise<MoyasarPayment> => {
  const { data } = await axios.get<MoyasarPayment>(
    `${API_URL}/payments/${paymentId}`,
    { headers: { Authorization: authHeader() } },
  );
  return data;
};

// ─── Refund Payment ───────────────────────────────────────────────────────────

/**
 * Issues a full or partial refund on a paid/captured payment.
 * Docs: https://docs.moyasar.com/api/payments/refund-payment
 */
export const refundPayment = async (
  input: RefundPaymentInput,
): Promise<MoyasarPayment> => {
  const payload: Record<string, unknown> = {};
  if (input.amountSAR !== undefined) payload.amount = toHalalat(input.amountSAR);
  if (input.reason) payload.reason = input.reason;

  const pid = input.paymentId || input.paymentIntentId;
  if (!pid) throw new Error('paymentId or paymentIntentId is required for refund');

  const { data } = await axios.post<MoyasarPayment>(
    `${API_URL}/payments/${pid}/refund`,
    payload,
    { headers: { Authorization: authHeader(), 'Content-Type': 'application/json' } },
  );

  return data;
};

// ─── Webhook Verification ─────────────────────────────────────────────────────

/**
 * Verifies an incoming Moyasar webhook by comparing `secret_token` in the
 * JSON body against MOYASAR_WEBHOOK_SECRET using a constant-time comparison.
 *
 * Moyasar does NOT use HMAC — it sends the shared secret as a plain field.
 * Docs: https://docs.moyasar.com/api/other/webhooks/webhook-reference
 */
export const verifyWebhookEvent = (rawBody: string): MoyasarWebhookEvent => {
  let event: MoyasarWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MoyasarWebhookEvent;
  } catch {
    throw new Error('Invalid webhook payload — could not parse JSON');
  }

  const received = event.secret_token ?? '';
  const expected = process.env.MOYASAR_WEBHOOK_SECRET ?? '';

  if (received.length === 0 || received.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    throw new Error('Webhook secret_token mismatch — request rejected');
  }

  return event;
};

// ─── Webhook Event Handler ────────────────────────────────────────────────────

/**
 * Processes a verified Moyasar webhook event.
 * Note: Moyasar spells the failure event type "payment_faild" (their typo).
 */
export const handleWebhookEvent = async (
  event: MoyasarWebhookEvent,
): Promise<void> => {
  const payment = event.data;

  switch (event.type) {
    case 'payment_paid':
      console.log(`[Moyasar] ✅ Payment paid: ${payment.id} — ${payment.amount_format}`);
      break;

    case 'payment_faild':   // intentional Moyasar typo
      console.warn(`[Moyasar] ❌ Payment failed: ${payment.id}`);
      break;

    case 'payment_refunded':
      console.log(`[Moyasar] ↩️ Payment refunded: ${payment.id} — refunded: ${payment.refunded}`);
      break;

    case 'payment_voided':
      console.log(`[Moyasar] 🚫 Payment voided: ${payment.id}`);
      break;

    case 'payment_authorized':
      console.log(`[Moyasar] 🔒 Payment authorized: ${payment.id}`);
      break;

    case 'payment_captured':
      console.log(`[Moyasar] 💰 Payment captured: ${payment.id}`);
      break;

    case 'payment_verified':
      console.log(`[Moyasar] ✔️ Payment verified: ${payment.id}`);
      break;

    default:
      console.log(`[Moyasar] ❓ Unhandled event: ${(event as MoyasarWebhookEvent).type}`);
  }
};
