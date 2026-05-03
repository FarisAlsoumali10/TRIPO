import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  itemType: 'event' | 'tour' | 'rental';
  itemId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  amount: number;  // in SAR (not subunit)
  currency: string;
  provider: string;
  providerSessionId: string;
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paidAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    itemType: {
      type: String,
      enum: ['event', 'tour', 'rental'],
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    provider: {
      type: String,
      default: 'stripe',
    },
    providerSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'failed'],
      default: 'completed',
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
