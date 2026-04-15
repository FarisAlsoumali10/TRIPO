import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReportTargetType, ReportStatus, ActionTaken } from '../types';

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  // ✅ توسيع أنواع الأهداف لتشمل الأماكن والمستخدمين مستقبلاً
  targetType: ReportTargetType | 'itinerary' | 'message' | 'session' | 'campsite' | 'user' | 'place' | 'review';
  targetId: Types.ObjectId;
  reason: string;
  description?: string;
  status: ReportStatus | 'pending' | 'reviewed' | 'resolved';
  actionTaken?: ActionTaken | 'hidden' | 'removed' | 'dismissed';
  reviewedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ لتسهيل معرفة البلاغات التي رفعها مستخدم معين
  },
  targetType: {
    type: String,
    enum: ['itinerary', 'message', 'session', 'campsite', 'user', 'place', 'review'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true // ✅ لمعرفة عدد البلاغات على عنصر معين بسرعة
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending',
    index: true // ✅ فهرس أساسي للوحة التحكم
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

// ==========================================
//  فهارس الأداء الخاصة بلوحة التحكم (Admin Dashboard Indexes)
// ==========================================

// الفهرس الذهبي للإدارة: جلب البلاغات المعلقة مرتبة زمنياً
reportSchema.index({ status: 1, createdAt: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);