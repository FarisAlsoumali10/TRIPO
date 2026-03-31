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
  avgCost?: number;
  duration?: number;
  category?: string;
  image?: string;
  priceRange?: 1 | 2 | 3 | 4;
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  accessibility?: { wheelchair?: boolean; parking?: boolean; family?: boolean };
  bestSeasons?: string[];
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
  duration: { type: Number, default: 60 },
  category: { type: String, index: true },
  image: { type: String },
  priceRange: { type: Number, min: 1, max: 4 },
  openingHours: {
    type: Map,
    of: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    default: {}
  },
  accessibility: {
    wheelchair: { type: Boolean, default: false },
    parking:    { type: Boolean, default: false },
    family:     { type: Boolean, default: false }
  },
  bestSeasons: {
    type: [String],
    enum: ['spring', 'summer', 'autumn', 'winter'],
    default: []
  }
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