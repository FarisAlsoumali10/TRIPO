import {
  createPayment,
  getPayment,
  refundPayment,
  type CreatePaymentInput,
  type RefundPaymentInput,
  type MoyasarPayment,
} from './providers/MoyasarProvider';

if (!process.env.MOYASAR_SECRET_KEY) {
  console.warn('⚠️ [Payment] MOYASAR_SECRET_KEY is not set. Payment features will be non-functional.');
}

export const PaymentService = {
  /**
   * Create a Moyasar payment and return the redirect URL.
   * Frontend should do: window.location.href = result.redirectUrl
   */
  createPayment: (input: CreatePaymentInput): Promise<MoyasarPayment> =>
    createPayment(input),

  /**
   * Fetch a payment by ID for server-side verification.
   * Call after the user returns from the payment page.
   */
  verifyPaymentById: (paymentId: string): Promise<MoyasarPayment> =>
    getPayment(paymentId),

  /**
   * Issue a full or partial refund.
   */
  refund: (input: RefundPaymentInput): Promise<MoyasarPayment> =>
    refundPayment(input),
};
