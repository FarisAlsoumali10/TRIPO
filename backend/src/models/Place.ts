import mongoose, { Document, Schema } from 'mongoose';
import { Coordinates, RatingSummary, ContentStatus } from '../types';

export interface IPlace extends Document {
  name: string;
  city: string;
  description: string;
  categoryTags: string[];
  coordinates: Coordinates;
  photos: string[];
  ratingSummary: RatingSummary;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const placeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  categoryTags: {
    type: [String],
    default: []
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  photos: {
    type: [String],
    default: []
  },
  ratingSummary: {
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'deactivated', 'hidden', 'removed'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 2dsphere index for geospatial queries
placeSchema.index({ coordinates: '2dsphere' });

export const Place = mongoose.model<IPlace>('Place', placeSchema);
