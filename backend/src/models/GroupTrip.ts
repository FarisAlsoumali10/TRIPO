import mongoose, { Document, Schema, Types } from 'mongoose';
import { GroupTripStatus, Invitation } from '../types';

export interface IGroupTrip extends Document {
  organizerId: Types.ObjectId;
  baseItineraryId: Types.ObjectId;
  title: string;
  memberIds: Types.ObjectId[];
  invitations: Invitation[];
  status: GroupTripStatus;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const groupTripSchema = new Schema({
  organizerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  baseItineraryId: {
    type: Schema.Types.ObjectId,
    ref: 'Itinerary',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  memberIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  invitations: {
    type: [invitationSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  }
}, {
  timestamps: true
});

export const GroupTrip = mongoose.model<IGroupTrip>('GroupTrip', groupTripSchema);
