export interface CreateSessionInput {
  itemTitle: string;
  amountInSubunit: number;  // smallest currency unit (halalas for SAR)
  currency: string;
  quantity: number;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface CreateSessionResult {
  sessionId: string;
  redirectUrl: string;
  provider: string;
}

export type PaymentEventType =
  | 'payment.completed'
  | 'payment.expired'
  | 'payment.failed'
  | 'refund.completed'
  | 'unknown';

export interface WebhookEvent {
  type: PaymentEventType;
  providerEventType: string;
  sessionId?: string;
  paymentIntentId?: string;
  metadata?: Record<string, string>;
  amountTotal?: number;   // in subunit
  refundedAmount?: number;
}

export interface RefundInput {
  paymentIntentId: string;
  amountInSubunit?: number;  // undefined = full refund
  reason?: string;
}

export interface IPaymentProvider {
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent>;
  refund(input: RefundInput): Promise<void>;
}
