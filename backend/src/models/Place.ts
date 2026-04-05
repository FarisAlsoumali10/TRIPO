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

  // --- خصائص الاكتشاف والفلترة المتقدمة ---
  accessType?: 'free' | 'ticketed' | 'entry_fee';
  isFamilySuitable?: boolean;
  isFoodTruck?: boolean;
  subcategory?: string;
  cuisineType?: string;
  seasonalDates?: { openDate?: string; closeDate?: string };
  isTrending?: boolean;
  isVerifiedPlace?: boolean;
  groupOffer?: { available: boolean; description?: string; minGroupSize?: number };
  lastLocationUpdate?: Date;
  address?: string;
  phone?: string;
  website?: string;
  gender?: 'mixed' | 'women_only' | 'men_only';
  hasSportsFacilities?: boolean;
  sportsFacilities?: string[];
  entryFeeAmount?: number;
  partnerVenue?: boolean;
  appDiscount?: number;
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
    index: true
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
    avgRating: { type: Number, default: 0, index: true },
    reviewCount: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'deactivated', 'hidden', 'removed'],
    default: 'active',
    index: true
  },
  // --- الخصائص الأساسية ---
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
  },
  // --- خصائص الاكتشاف والفلترة المتقدمة ---
  accessType: {
    type: String,
    enum: ['free', 'ticketed', 'entry_fee'],
    default: 'free',
    index: true
  },
  isFamilySuitable: { type: Boolean, default: false, index: true },
  isFoodTruck: { type: Boolean, default: false, index: true },
  subcategory: { type: String },
  cuisineType: { type: String },
  seasonalDates: {
    openDate:  { type: String },
    closeDate: { type: String }
  },
  isTrending: { type: Boolean, default: false, index: true },
  isVerifiedPlace: { type: Boolean, default: false },
  groupOffer: {
    available:    { type: Boolean, default: false },
    description:  { type: String },
    minGroupSize: { type: Number }
  },
  lastLocationUpdate: { type: Date },
  address:  { type: String },
  phone:    { type: String },
  website:  { type: String },
  gender: {
    type: String,
    enum: ['mixed', 'women_only', 'men_only'],
    default: 'mixed'
  },
  hasSportsFacilities: { type: Boolean, default: false },
  sportsFacilities:    { type: [String], default: [] },
  entryFeeAmount:      { type: Number },
  partnerVenue:        { type: Boolean, default: false },
  appDiscount:         { type: Number }
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