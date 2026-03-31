import mongoose, { Document, Schema, Types } from 'mongoose';
import { GroupTripStatus, Invitation } from '../types';

export interface IGroupTrip extends Document {
  organizerId: Types.ObjectId;
  baseItineraryId?: Types.ObjectId;
  isPrivate?: boolean;
  title: string;
  description?: string; // ✅ وصف اختياري للرحلة
  coverImage?: string; // ✅ صورة الغلاف
  startDate?: Date; // ✅ تاريخ بداية الرحلة
  endDate?: Date; // ✅ تاريخ نهاية الرحلة
  estimatedBudget?: number; // ✅ الميزانية المتوقعة
  memberIds: Types.ObjectId[];
  invitations: Invitation[];
  status: GroupTripStatus | 'planning' | 'active' | 'completed' | 'cancelled';
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
    required: true,
    index: true // ✅ فهرس لتسريع بحث رحلات المنظم
  },
  baseItineraryId: {
    type: Schema.Types.ObjectId,
    ref: 'Itinerary',
    required: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  coverImage: {
    type: String
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  estimatedBudget: {
    type: Number,
    min: 0,
    default: 0
  },
  memberIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: [],
    index: true // ✅ فهرس مهم جداً لسرعة جلب رحلات المستخدم
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

// ✅ فهرس مركب لتسريع جلب "الرحلات النشطة/المخطط لها لمستخدم معين" للوحة التحكم
groupTripSchema.index({ memberIds: 1, status: 1 });

export const GroupTrip = mongoose.model<IGroupTrip>('GroupTrip', groupTripSchema);