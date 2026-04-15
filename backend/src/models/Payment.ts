import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  itemType: 'event' | 'tour' | 'rental';
  itemId: mongoose.Types.ObjectId;
  amount: number; // in SAR (not halalas)
  currency: string;
  stripeSessionId: string;
  status: 'pending' | 'completed' | 'refunded';
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
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'completed',
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
