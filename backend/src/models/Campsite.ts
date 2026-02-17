import mongoose, { Document, Schema, Types } from 'mongoose';
import { Coordinates, ContentStatus, PricingRange } from '../types';

export interface ICampsite extends Document {
  hostId: Types.ObjectId;
  name: string;
  description: string;
  city: string;
  coordinates: Coordinates;
  pricingRange: PricingRange;
  facilities: string[];
  tags: string[];
  capacity: number;
  bbqOption: boolean;
  images: string[];
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const campsiteSchema = new Schema({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  pricingRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  facilities: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  bbqOption: {
    type: Boolean,
    default: false
  },
  images: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'deactivated', 'hidden', 'removed'],
    default: 'active'
  }
}, {
  timestamps: true
});

campsiteSchema.index({ coordinates: '2dsphere' });

export const Campsite = mongoose.model<ICampsite>('Campsite', campsiteSchema);
