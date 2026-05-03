import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPointsTransaction extends Document {
  userId: Types.ObjectId;
  action: string;
  points: number;
  label: string;
  createdAt: Date;
}

const pointsTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    points: { type: Number, required: true },
    label:  { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PointsTransaction = mongoose.model<IPointsTransaction>('PointsTransaction', pointsTransactionSchema);
