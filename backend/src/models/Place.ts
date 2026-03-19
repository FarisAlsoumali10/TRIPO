import mongoose, { Document, Schema } from 'mongoose';
import { Coordinates, RatingSummary, ContentStatus } from '../types';

export interface IPlace extends Document {
  name: string;
  city: string;
  description: string;
  categoryTags: string[];
  coordinates: Coordinates;
  photos: string[];
  ratingSummary: RatingSummary;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;

  // --- الخصائص المضافة لدعم الواجهة (Frontend) ---
  avgCost?: number;     // لحساب تكلفة الرحلة الإجمالية
  duration?: number;    // لحساب مدة الزيارة الإجمالية (بالدقائق)
  category?: string;    // كـ Fallback للواجهات القديمة
  image?: string;       // كـ Fallback لعرض صورة الغلاف الأساسية
}

const placeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    index: true,
    default: 'Riyadh'
  },
  description: {
    type: String,
    required: true
  },
  categoryTags: {
    type: [String],
    default: [],
    index: true // ✅ فهرس لتسريع فلترة الأماكن حسب التصنيف (كافيهات، مطاعم..)
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  photos: {
    type: [String],
    default: []
  },
  ratingSummary: {
    avgRating: { type: Number, default: 0, index: true }, // ✅ تسريع ترتيب الأماكن "الأعلى تقييماً"
    reviewCount: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'deactivated', 'hidden', 'removed'],
    default: 'active',
    index: true // ✅ لتسريع جلب الأماكن النشطة فقط
  },
  // --- الخصائص المضافة ---
  avgCost: { type: Number, default: 0 },
  duration: { type: Number, default: 60 }, // افتراض 60 دقيقة للزيارة
  category: { type: String, index: true },
  image: { type: String }
}, {
  timestamps: true
});

// ==========================================
// 🚀 فهارس الأداء العالي (High-Performance Indexes)
// ==========================================

// 1. فهرس البحث الجغرافي (لمعرفة الأماكن القريبة)
placeSchema.index({ coordinates: '2dsphere' });

// 2. الفهرس النصي (Text Index): لجعل البحث عن اسم المكان أو وصفه سريعاً جداً وخفيفاً على السيرفر
placeSchema.index({ name: 'text', description: 'text' });

export const Place = mongoose.model<IPlace>('Place', placeSchema);