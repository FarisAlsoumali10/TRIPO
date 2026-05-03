import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayoutRequest extends Document {
  hostId: Types.ObjectId;
  amount: number;
  currency: string;
  bankName?: string;
  iban?: string;
  status: 'pending' | 'processed' | 'rejected';
  note?: string;
  requestedAt: Date;
  processedAt?: Date;
}

const payoutRequestSchema = new Schema<IPayoutRequest>(
  {
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    bankName: { type: String },
    iban:     { type: String },
    status: {
      type: String,
      enum: ['pending', 'processed', 'rejected'],
      default: 'pending',
    },
    note: { type: String },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: { type: Date },
  },
  { timestamps: false },
);

export const PayoutRequest = mongoose.model<IPayoutRequest>('PayoutRequest', payoutRequestSchema);
