import mongoose, { Document, Schema, Types } from 'mongoose';
import { MarketplaceTargetType, BookingStatus } from '../types';

export interface IBooking extends Document {
  userId: Types.ObjectId;
  targetType: MarketplaceTargetType;
  targetId: Types.ObjectId;
  status: BookingStatus;
  bookingDetails: any;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['session', 'campsite'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  bookingDetails: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
