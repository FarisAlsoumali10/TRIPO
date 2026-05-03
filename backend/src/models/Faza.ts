import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFaza extends Document {
  userId?: Types.ObjectId;
  communityId?: Types.ObjectId;
  question: string;
  category?: string;
  urgency?: 'today' | 'week' | 'anytime';
  pointsReward: number;
  anonymous: boolean;
}

const FazaSchema: Schema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User' },
  communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
  question:    { type: String, required: true },
  category:    { type: String, default: 'general' },
  urgency:     { type: String, enum: ['today', 'week', 'anytime'], default: 'anytime' },
  pointsReward:{ type: Number, default: 50 },
  anonymous:   { type: Boolean, default: false },
}, { timestamps: true });

export const Faza = mongoose.model<IFaza>('Faza', FazaSchema);
