import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReviewTargetType } from '../types';

export interface IReview extends Document {
  userId: Types.ObjectId;
  targetType: ReviewTargetType;
  targetId: Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  mediaRefs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['place', 'itinerary'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true
  },
  comment: {
    type: String
  },
  mediaRefs: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Compound index for efficient querying by target
reviewSchema.index({ targetType: 1, targetId: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
