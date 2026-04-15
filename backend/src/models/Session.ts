import mongoose, { Document, Schema, Types } from 'mongoose';
import { ContentStatus, Schedule, PricingRange, RatingSummary } from '../types';

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
  // ✅ الخصائص المضافة لدعم واجهة التطبيق ونظام الثقة
  images: string[];
  image?: string;
  ratingSummary: RatingSummary;
  status: ContentStatus | 'active' | 'deactivated' | 'hidden' | 'removed';
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
    required: true,
    index: true // ✅ تسريع جلب الجلسات الخاصة بمزود خدمة معين
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
    required: true,
    index: true // ✅ فلترة سريعة حسب المدينة
  },
  tags: {
    type: [String],
    default: [],
    index: true // ✅ فلترة سريعة حسب نوع الجلسة (تصنيفات)
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  currentBookings: {
    type: Number,
    default: 0,
    min: 0 // ✅ حماية إضافية لمنع الحجوزات بالسالب
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
  images: {
    type: [String],
    default: []
  },
  image: {
    type: String
  },
  ratingSummary: {
    avgRating: { type: Number, default: 0, index: true }, // ✅ لترتيب الجلسات "الأعلى تقييماً"
    reviewCount: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'deactivated', 'hidden', 'removed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// ==========================================
//  فهارس البحث والتصفح (Discovery Indexes)
// ==========================================

// الفهرس الذهبي لشاشة المتجر: جلب الجلسات النشطة في مدينة معينة بسرعة البرق
sessionSchema.index({ city: 1, status: 1 });

// فهرس البحث النصي: لتشغيل شريط البحث في الواجهة الأمامية
sessionSchema.index({ title: 'text', description: 'text' });

export const Session = mongoose.model<ISession>('Session', sessionSchema);