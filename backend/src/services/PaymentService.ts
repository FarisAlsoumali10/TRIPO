import { IPaymentProvider, CreateSessionInput, RefundInput } from '../interfaces/IPaymentProvider';
import { StripeProvider } from './providers/StripeProvider';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ [Payment] STRIPE_SECRET_KEY is not set. Payment features will be non-functional.');
}

function buildProvider(): IPaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase();
  if (name === 'stripe') return new StripeProvider();
  throw new Error(`Unknown PAYMENT_PROVIDER: "${name}". Supported: stripe`);
}

// Singleton — one provider instance for the process lifetime.
let _provider: IPaymentProvider | null = null;
const getProvider = (): IPaymentProvider => {
  if (!_provider) _provider = buildProvider();
  return _provider;
};

export const PaymentService = {
  createSession:  (input: CreateSessionInput)               => getProvider().createSession(input),
  verifyWebhook:  (rawBody: Buffer, signature: string)      => getProvider().verifyWebhook(rawBody, signature),
  refund:         (input: RefundInput)                      => getProvider().refund(input),
};
