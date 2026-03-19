import mongoose, { Document, Schema, Types } from 'mongoose';
import { Coordinates, ContentStatus, PricingRange, RatingSummary } from '../types';

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
  image?: string; // ✅ صورة الغلاف الأساسية للواجهة الأمامية
  ratingSummary: RatingSummary; // ✅ لدعم نظام التقييمات والمراجعات
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const campsiteSchema = new Schema({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ تسريع استعلام "مخيمات مضيف معين"
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
    required: true,
    index: true // ✅ تسريع الفلترة حسب المدينة
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
  image: {
    type: String // صورة افتراضية
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

// فهرس البحث الجغرافي
campsiteSchema.index({ coordinates: '2dsphere' });
// فهرس مركب لتسريع استعلامات الواجهة (المخيمات النشطة في مدينة معينة)
campsiteSchema.index({ city: 1, status: 1 });

export const Campsite = mongoose.model<ICampsite>('Campsite', campsiteSchema);