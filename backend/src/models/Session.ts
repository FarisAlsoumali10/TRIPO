import mongoose, { Document, Schema, Types } from 'mongoose';
import { ContentStatus, Schedule, PricingRange } from '../types';

export interface ISession extends Document {
  hostId: Types.ObjectId;
  title: string;
  description: string;
  city: string;
  tags: string[];
  capacity: number;
  currentBookings: number;
  pricingRange: PricingRange;
  schedule: Schedule[];
  deliveryOptions: string[];
  equipmentOptions: string[];
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const sessionSchema = new Schema({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
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
  tags: {
    type: [String],
    default: []
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  currentBookings: {
    type: Number,
    default: 0
  },
  pricingRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  schedule: {
    type: [scheduleSchema],
    default: []
  },
  deliveryOptions: {
    type: [String],
    default: []
  },
  equipmentOptions: {
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

export const Session = mongoose.model<ISession>('Session', sessionSchema);
