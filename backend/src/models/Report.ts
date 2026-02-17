import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReportTargetType, ReportStatus, ActionTaken } from '../types';

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: string;
  description?: string;
  status: ReportStatus;
  actionTaken?: ActionTaken;
  reviewedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const reportSchema = new Schema({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['itinerary', 'message', 'session', 'campsite'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  actionTaken: {
    type: String,
    enum: ['hidden', 'removed', 'dismissed']
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

export const Report = mongoose.model<IReport>('Report', reportSchema);
