import mongoose, { Document, Schema } from 'mongoose';

export interface IFaza extends Document {
  communityId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  question: string;
  category?: string;
  urgency: 'today' | 'week' | 'anytime';
  pointsReward: number;
  photoUrl?: string;
  anonymous: boolean;
  status: 'open' | 'completed';
  answeredBy?: string;   // userId
  answeredByName?: string;
  answeredAt?: Date;
  answerText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fazaSchema = new Schema<IFaza>(
  {
    communityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String },
    userAvatar: { type: String },
    question: { type: String, required: true, trim: true },
    category: { type: String },
    urgency: {
      type: String,
      enum: ['today', 'week', 'anytime'],
      default: 'anytime',
    },
    pointsReward: { type: Number, required: true, min: 10, max: 500, default: 50 },
    photoUrl: { type: String },
    anonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['open', 'completed'],
      default: 'open',
    },
    answeredBy: { type: String },
    answeredByName: { type: String },
    answeredAt: { type: Date },
    answerText: { type: String },
  },
  { timestamps: true }
);

export const Faza = mongoose.model<IFaza>('Faza', fazaSchema);
