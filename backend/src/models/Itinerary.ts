import mongoose, { Document, Schema, Types } from 'mongoose';
import { ContentStatus } from '../types';

// ✅ مخطط الأماكن داخل الرحلة (يربط الرحلة بالأماكن الحقيقية في قاعدة البيانات)
export interface IItineraryPlace {
  placeId: Types.ObjectId;
  order: number;
  timeSlot?: string;
}

export interface IItinerary extends Document {
  userId: Types.ObjectId;
  title: string;
  city: string;
  estimatedDuration: number; // ✅ متوافق مع الواجهة وملف الـ Seed
  estimatedCost: number;     // ✅ متوافق مع الواجهة
  distance: number;          // ✅ متوافق مع الواجهة
  places: IItineraryPlace[]; // ✅ يربط الأماكن بشكل صحيح
  notes?: string;
  status: ContentStatus | 'draft' | 'published' | 'hidden' | 'removed';
  isVerified: boolean;
  ratingSummary: {           // ✅ متوافق مع نظام التقييمات الذي أصلحناه
    avgRating: number;
    reviewCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const itineraryPlaceSchema = new Schema({
  placeId: { type: Schema.Types.ObjectId, ref: 'Place', required: true },
  order: { type: Number, required: true },
  timeSlot: { type: String }
}, { _id: false });

const itinerarySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ تسريع جلب رحلات المستخدم
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true,
    index: true // ✅ تسريع فلترة الرحلات حسب المدينة
  },
  estimatedDuration: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  distance: {
    type: Number,
    default: 0
  },
  places: {
    type: [itineraryPlaceSchema],
    default: []
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'hidden', 'removed'],
    default: 'draft',
    index: true // ✅ تسريع جلب الرحلات المنشورة (published) فقط
  },
  isVerified: {
    type: Boolean,
    default: false // ✅ لتمييز الرحلات الموثوقة أو الموصى بها
  },
  ratingSummary: {
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export const Itinerary = mongoose.model<IItinerary>('Itinerary', itinerarySchema);